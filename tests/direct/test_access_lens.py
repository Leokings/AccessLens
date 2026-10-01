import json
from pathlib import Path
import re

import pytest
from gltest.direct.sdk_loader import setup_sdk_paths


CONTRACT_PATH = Path("contracts/access_lens.py")
TEST_TIME = "2026-10-01T12:00:00Z"
TEST_URL = "https://example.com/signup"
SECOND_URL = "https://example.org/join"
PAGE_HTML = (
    '<html lang="en"><body><header><a href="/">Acme</a></header><main>'
    '<h1>Create your Acme account</h1><p>Join the community in under a minute.</p>'
    '<form><label for="email">Email address</label><input id="email" name="email" '
    'type="email" autocomplete="email"><button type="submit">Create account</button></form>'
    '<a href="/privacy">Privacy policy</a><a href="/contact">Contact support</a>'
    '</main></body></html>'
)


def as_address(value):
    from genlayer.py.types import Address

    return Address(value) if isinstance(value, (bytes, str)) else value


def deploy_lens(direct_vm, direct_deploy, sender):
    setup_sdk_paths(CONTRACT_PATH, "v0.2.16")
    direct_vm.sender = as_address(sender)
    direct_vm.value = 0
    direct_vm.warp(TEST_TIME)
    direct_vm.check_pickling = True
    return direct_deploy(str(CONTRACT_PATH))


def audit_payload(**overrides):
    payload = {
        "accessibility_score": 85,
        "dark_pattern_score": 90,
        "trust_score": 85,
        "findings": [
            {
                "category": "ACCESSIBILITY",
                "severity": "LOW",
                "title": "Signup purpose could be clearer",
                "evidence": "Create your Acme account",
                "recommendation": "Add a short description of what members receive after registration.",
            }
        ],
        "summary": "The signup page has sound semantics and clear controls, with one small opportunity to explain the account benefit more clearly.",
    }
    payload.update(overrides)
    return payload


def mock_page(direct_vm, url=TEST_URL, body=PAGE_HTML):
    direct_vm.mock_web(
        re.escape(url),
        {"method": "GET", "response": {"status": 200, "headers": {}, "body": body}},
    )


def mock_leader(direct_vm, payload=None):
    direct_vm.mock_llm(
        r"(?s).*ACCESSLENS_AUDIT_V1.*",
        json.dumps(payload or audit_payload()),
    )


def mock_validator(direct_vm, valid=True):
    direct_vm.mock_llm(
        r"(?s).*ACCESSLENS_CANDIDATE_REVIEW_V1.*",
        json.dumps({"valid": valid}),
    )


def submit(contract, reference="audit-example-001", url=TEST_URL, focus="", previous=0):
    return contract.audit_site(reference, url, focus, previous)


def test_deploy_exposes_versioned_empty_state(direct_vm, direct_deploy, direct_alice):
    contract = deploy_lens(direct_vm, direct_deploy, direct_alice)
    info = contract.get_contract_info()

    assert info["contract_version"] == "1.0.2"
    assert info["audit_schema_version"] == "ACCESSLENS_AUDIT_V1"
    assert info["policy_version"] == "ACCESSLENS_PUBLIC_WEB_V1"
    assert info["audit_count"] == 0
    assert len(info["config_digest"]) == 64


def test_consensus_audit_is_stored_and_queryable(direct_vm, direct_deploy, direct_alice):
    contract = deploy_lens(direct_vm, direct_deploy, direct_alice)
    mock_page(direct_vm)
    mock_leader(direct_vm)

    audit_id = submit(contract)
    audit = contract.get_audit(audit_id)

    assert audit_id == 1
    assert audit["verdict"] == "CLEAR"
    assert audit["overall_score"] == 87
    assert audit["accessibility_score"] == 85
    assert audit["url"] == TEST_URL
    assert audit["domain"] == "example.com"
    assert json.loads(audit["findings_json"])[0]["severity"] == "LOW"
    assert len(audit["page_digest"]) == 64
    assert len(audit["audit_digest"]) == 64
    assert contract.get_audit_count() == 1


def test_validator_accepts_materially_supported_report(direct_vm, direct_deploy, direct_alice):
    contract = deploy_lens(direct_vm, direct_deploy, direct_alice)
    mock_page(direct_vm)
    mock_leader(direct_vm)
    submit(contract, "validator-accept-001")

    direct_vm.clear_mocks()
    mock_page(direct_vm)
    mock_validator(direct_vm, True)
    assert direct_vm.run_validator() is True


def test_validator_rejects_materially_wrong_report(direct_vm, direct_deploy, direct_alice):
    contract = deploy_lens(direct_vm, direct_deploy, direct_alice)
    mock_page(direct_vm)
    mock_leader(direct_vm)
    submit(contract, "validator-reject-001")

    direct_vm.clear_mocks()
    mock_page(direct_vm)
    mock_validator(direct_vm, False)
    assert direct_vm.run_validator() is False


def test_high_severity_finding_forces_high_risk(direct_vm, direct_deploy, direct_alice):
    risky_html = PAGE_HTML.replace(
        "Join the community in under a minute.",
        "Only 2 minutes left - act now or lose your place.",
    )
    payload = audit_payload(
        accessibility_score=80,
        dark_pattern_score=30,
        trust_score=55,
        findings=[
            {
                "category": "DARK_PATTERN",
                "severity": "HIGH",
                "title": "Unsupported urgency pressure",
                "evidence": "Only 2 minutes left - act now or lose your place.",
                "recommendation": "Remove the countdown claim unless the deadline is real and independently explained.",
            }
        ],
        summary="The signup flow applies severe urgency pressure without visible support, so users may be pushed into an uninformed decision.",
    )
    contract = deploy_lens(direct_vm, direct_deploy, direct_alice)
    mock_page(direct_vm, body=risky_html)
    mock_leader(direct_vm, payload)

    audit = contract.get_audit(submit(contract, "high-risk-001"))
    assert audit["verdict"] == "HIGH_RISK"
    assert audit["dark_pattern_score"] == 30


def test_short_precise_finding_title_is_accepted(direct_vm, direct_deploy, direct_alice):
    """Regression: StudioNet can legitimately return labels such as ARIA."""
    contract = deploy_lens(direct_vm, direct_deploy, direct_alice)
    mock_page(direct_vm)
    mock_leader(
        direct_vm,
        audit_payload(
            findings=[
                {
                    "category": "ACCESSIBILITY",
                    "severity": "LOW",
                    "title": "ARIA",
                    "evidence": "Create your Acme account",
                    "recommendation": "Add an explicit accessible description for the signup region.",
                }
            ]
        ),
    )

    audit = contract.get_audit(submit(contract, "short-title-001"))
    assert json.loads(audit["findings_json"])[0]["title"] == "ARIA"


def test_zero_finding_report_is_accepted(direct_vm, direct_deploy, direct_alice):
    contract = deploy_lens(direct_vm, direct_deploy, direct_alice)
    mock_page(direct_vm)
    mock_leader(
        direct_vm,
        audit_payload(
            accessibility_score=95,
            dark_pattern_score=95,
            trust_score=90,
            findings=[],
            summary="The rendered page exposes clear semantics and controls without a material issue supported by the supplied HTML.",
        ),
    )

    audit = contract.get_audit(submit(contract, "zero-findings-001"))
    assert json.loads(audit["findings_json"]) == []
    assert audit["verdict"] == "CLEAR"


def test_model_prose_is_safely_bounded_without_cosmetic_rollbacks(
    direct_vm, direct_deploy, direct_alice
):
    long_evidence = "Accessible interface evidence " * 12
    page = PAGE_HTML.replace("Join the community in under a minute.", long_evidence)
    contract = deploy_lens(direct_vm, direct_deploy, direct_alice)
    mock_page(direct_vm, body=page)
    mock_leader(
        direct_vm,
        audit_payload(
            findings=[
                {
                    "category": "ACCESSIBILITY",
                    "severity": "LOW",
                    "title": "A",
                    "evidence": long_evidence,
                    "recommendation": "Fix.",
                }
            ],
            summary="Clear.",
        ),
    )

    audit = contract.get_audit(submit(contract, "bounded-prose-001"))
    finding = json.loads(audit["findings_json"])[0]
    assert finding["title"] == "A"
    assert finding["recommendation"] == "Fix."
    assert len(finding["evidence"]) == 220
    assert audit["summary"] == "Clear."


@pytest.mark.parametrize(
    "bad_url",
    [
        "http://example.com",
        "https://localhost/dashboard",
        "https://127.0.0.1/admin",
        "https://user@example.com/private",
        "https://example.com/page#section",
        "https://example.com:8443/page",
    ],
)
def test_only_public_https_domains_are_accepted(direct_vm, direct_deploy, direct_alice, bad_url):
    contract = deploy_lens(direct_vm, direct_deploy, direct_alice)
    with direct_vm.expect_revert("[EXPECTED]"):
        submit(contract, "bad-url-001", bad_url)
    assert contract.get_audit_count() == 0


def test_url_is_canonicalized_without_losing_query(direct_vm, direct_deploy, direct_alice):
    raw_url = "https://Example.COM:443/signup?ref=launch"
    canonical = "https://example.com/signup?ref=launch"
    contract = deploy_lens(direct_vm, direct_deploy, direct_alice)
    mock_page(direct_vm, canonical)
    mock_leader(direct_vm)

    audit = contract.get_audit(submit(contract, "canonical-url-001", raw_url))
    assert audit["url"] == canonical


def test_finding_evidence_must_appear_in_rendered_page(direct_vm, direct_deploy, direct_alice):
    payload = audit_payload()
    payload["findings"][0]["evidence"] = "This exact claim does not appear anywhere on the page."
    contract = deploy_lens(direct_vm, direct_deploy, direct_alice)
    mock_page(direct_vm)
    mock_leader(direct_vm, payload)

    with direct_vm.expect_revert("[LLM_ERROR] EVIDENCE_NOT_FOUND"):
        submit(contract, "invented-evidence-001")
    assert contract.get_audit_count() == 0


def test_malformed_llm_output_does_not_write_state(direct_vm, direct_deploy, direct_alice):
    contract = deploy_lens(direct_vm, direct_deploy, direct_alice)
    mock_page(direct_vm)
    direct_vm.mock_llm(r"(?s).*ACCESSLENS_AUDIT_V1.*", json.dumps({"score": 100}))

    with direct_vm.expect_revert("[LLM_ERROR] OUTPUT_FIELDS"):
        submit(contract, "malformed-output-001")
    assert contract.get_audit_count() == 0


def test_request_reference_is_idempotent_per_wallet(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy_lens(direct_vm, direct_deploy, direct_alice)
    mock_page(direct_vm)
    mock_leader(direct_vm)
    submit(contract, "same-reference-001")

    with direct_vm.expect_revert("REQUEST_REFERENCE_EXISTS"):
        submit(contract, "same-reference-001")

    direct_vm.sender = as_address(direct_bob)
    second_id = submit(contract, "same-reference-001")
    assert second_id == 2


def test_reaudit_links_to_same_url_and_updates_latest(direct_vm, direct_deploy, direct_alice):
    contract = deploy_lens(direct_vm, direct_deploy, direct_alice)
    mock_page(direct_vm)
    mock_leader(direct_vm)
    first_id = submit(contract, "reaudit-first-001")
    second_id = submit(contract, "reaudit-second-001", previous=first_id)

    second = contract.get_audit(second_id)
    latest = contract.get_latest_for_url(TEST_URL)
    recent = contract.get_recent_audits(2)
    assert second["previous_audit_id"] == first_id
    assert latest["audit_id"] == second_id
    assert [item["audit_id"] for item in recent] == [second_id, first_id]


def test_reaudit_cannot_attach_to_another_site(direct_vm, direct_deploy, direct_alice):
    contract = deploy_lens(direct_vm, direct_deploy, direct_alice)
    mock_page(direct_vm)
    mock_leader(direct_vm)
    first_id = submit(contract, "parent-site-001")

    with direct_vm.expect_revert("PREVIOUS_URL_MISMATCH"):
        submit(contract, "wrong-parent-001", SECOND_URL, previous=first_id)
    assert contract.get_audit_count() == 1


def test_reference_lookup_is_bound_to_requester(direct_vm, direct_deploy, direct_alice, direct_bob):
    contract = deploy_lens(direct_vm, direct_deploy, direct_alice)
    mock_page(direct_vm)
    mock_leader(direct_vm)
    submit(contract, "owner-reference-001")

    found = contract.get_audit_by_reference(as_address(direct_alice), "owner-reference-001")
    assert found["audit_id"] == 1
    with direct_vm.expect_revert("AUDIT_NOT_FOUND"):
        contract.get_audit_by_reference(as_address(direct_bob), "owner-reference-001")
