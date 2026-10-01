"""Five-validator GLSim consensus tests for AccessLens."""

from __future__ import annotations

import json
from pathlib import Path

from gltest import create_accounts, get_contract_factory, get_validator_factory
from gltest.assertions import tx_execution_succeeded
from gltest.types import TransactionStatus
from gltest.utils import extract_contract_address


TEST_DATETIME = "2026-10-01T12:00:00Z"
TEST_URL = "https://example.com/signup"
PAGE_HTML = (
    '<html lang="en"><body><main><h1>Create your Acme account</h1>'
    '<form><label for="email">Email address</label><input id="email" name="email" '
    'type="email"><button type="submit">Create account</button></form>'
    '<a href="/privacy">Privacy policy</a></main></body></html>'
)


def _compact(value) -> str:
    return json.dumps(value, separators=(",", ":"))


def _receipt_dump(receipt) -> str:
    return json.dumps(receipt, indent=2, sort_keys=True, default=str)


def _leader_payload() -> dict:
    return {
        "accessibility_score": 85,
        "dark_pattern_score": 90,
        "trust_score": 85,
        "findings": [
            {
                "category": "ACCESSIBILITY",
                "severity": "LOW",
                "title": "Signup purpose could be clearer",
                "evidence": "Create your Acme account",
                "recommendation": "Add a short explanation of the account benefits before the form.",
            }
        ],
        "summary": "The signup page has sound semantics and clear controls, with one small opportunity to explain the account benefit more clearly.",
    }


def _deploy():
    owner = create_accounts(1)[0]
    contract_path = Path(__file__).resolve().parents[2] / "contracts" / "access_lens.py"
    factory = get_contract_factory(contract_file_path=contract_path)
    receipt = factory.deploy_contract_tx(
        args=[],
        account=owner,
        wait_transaction_status=TransactionStatus.FINALIZED,
    )
    assert tx_execution_succeeded(receipt), _receipt_dump(receipt)
    return factory.build_contract(extract_contract_address(receipt), account=owner), owner


def _validator_context() -> dict:
    validators = get_validator_factory().batch_create_mock_validators(
        5,
        mock_llm_response={
            "nondet_exec_prompt": {
                "ACCESSLENS_AUDIT_V1": _compact(_leader_payload()),
                "ACCESSLENS_CANDIDATE_REVIEW_V1": _compact({"valid": True}),
            }
        },
        mock_web_response={
            "nondet_web_request": {
                TEST_URL: {"method": "GET", "status": 200, "body": PAGE_HTML}
            }
        },
    )
    return {
        "validators": [validator.to_dict() for validator in validators],
        "genvm_datetime": TEST_DATETIME,
    }


def test_glsim_deployment_exposes_empty_versioned_state():
    contract, _owner = _deploy()
    info = contract.get_contract_info(args=[]).call()

    assert info["contract_version"] == "1.0.3"
    assert info["policy_version"] == "ACCESSLENS_PUBLIC_WEB_V2"
    assert info["audit_count"] == 0


def test_glsim_five_validators_finalize_and_store_audit():
    contract, owner = _deploy()
    receipt = contract.audit_site(
        args=["glsim-audit-001", TEST_URL, "Check the signup journey.", 0]
    ).transact(
        transaction_context=_validator_context(),
        wait_transaction_status=TransactionStatus.FINALIZED,
    )
    assert tx_execution_succeeded(receipt), _receipt_dump(receipt)

    audit = contract.get_audit(args=[1]).call()
    assert audit["requester"].lower() == str(owner.address).lower()
    assert audit["verdict"] == "CLEAR"
    assert audit["overall_score"] == 87
    assert json.loads(audit["findings_json"])[0]["category"] == "ACCESSIBILITY"
    assert contract.get_audit_count(args=[]).call() == 1
    assert len(audit["audit_digest"]) == 64
