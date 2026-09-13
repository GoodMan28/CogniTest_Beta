import argparse
import os
import sys

from bson import ObjectId
from pymongo import uri_parser

from app.config import settings
from app.repositories.indexes import apply_indexes, check_indexes
from app.repositories.tests import publish_test, unpublish_test
from app.services.bundle import BundleValidationError, load_bundle, validate_bundle
from app.services.preparation import run_preparation_algorithm
from app.services.verification import run_verification


def _target_database_name() -> str:
    try:
        return uri_parser.parse_uri(settings.mongodb_uri).get("database") or "(unknown)"
    except Exception:
        return "(unparseable MONGODB_URI)"


def _load_and_validate(directory: str):
    raw = load_bundle(directory)
    return validate_bundle(raw)


def main():
    parser = argparse.ArgumentParser(description="Analysis Service CLI")
    subparsers = parser.add_subparsers(dest="command")

    validate_p = subparsers.add_parser("validate", help="Validate a prepared bundle; no DB writes.")
    validate_p.add_argument("--dir", required=True)

    indexes_p = subparsers.add_parser("indexes", help="Check or apply demo indexes.")
    indexes_p.add_argument("--check", action="store_true")
    indexes_p.add_argument("--apply", action="store_true")

    prepare_p = subparsers.add_parser("prepare", help="Validate then prepare a bundle.")
    prepare_p.add_argument("--dir", required=True)

    verify_p = subparsers.add_parser("verify", help="Independently re-verify a prepared build.")
    verify_p.add_argument("--test-key", required=True)
    verify_p.add_argument("--dir", required=True)

    publish_p = subparsers.add_parser("publish", help="Publish a verified, READY test.")
    publish_p.add_argument("--test-key", required=True)

    unpublish_p = subparsers.add_parser("unpublish", help="Unpublish a PUBLISHED test.")
    unpublish_p.add_argument("--test-key", required=True)

    issue_p = subparsers.add_parser("issue-claims", help="Issue activation claims to a private file.")
    issue_p.add_argument("--test-key", required=True)
    issue_p.add_argument("--out", required=True)

    args = parser.parse_args()

    if args.command == "indexes":
        print(f"Target database: {_target_database_name()}")
        if args.check:
            res = check_indexes()
            import json
            print(json.dumps(res, indent=2, default=str))
        elif args.apply:
            apply_indexes()
            print("Indexes applied.")
        else:
            print("Specify --check or --apply.")
            sys.exit(1)

    elif args.command == "validate":
        print(f"Validating {args.dir} (no database writes)")
        try:
            bundle = _load_and_validate(args.dir)
        except BundleValidationError as e:
            for err in e.errors:
                print(f"  - {err}")
            print(f"Bundle INVALID: {len(e.errors)} error(s).")
            sys.exit(1)
        print(
            f"Bundle valid: {len(bundle.questions)} questions, "
            f"{len(bundle.roster)} students, "
            f"{sum(len(r.recommendations) for r in bundle.recommendations)} practice questions."
        )

    elif args.command == "prepare":
        print(f"Preparing {args.dir} for institute {settings.institute_id} "
              f"to target database {_target_database_name()}")
        try:
            bundle = _load_and_validate(args.dir)
        except BundleValidationError as e:
            for err in e.errors:
                print(f"  - {err}")
            print(f"Bundle INVALID: {len(e.errors)} error(s). Preparation aborted; no writes made.")
            sys.exit(1)

        try:
            run_preparation_algorithm(bundle)
            print("Preparation complete. Test is READY.")
        except Exception as e:
            print(f"Preparation failed: {e}")
            sys.exit(1)

    elif args.command == "verify":
        try:
            bundle = _load_and_validate(args.dir)
        except BundleValidationError as e:
            for err in e.errors:
                print(f"  - {err}")
            print(f"Bundle INVALID: {len(e.errors)} error(s). Cannot verify against an invalid bundle.")
            sys.exit(1)

        try:
            run_verification(settings.institute_id, args.test_key, bundle)
        except Exception as e:
            print(f"Verification failed: {e}")
            sys.exit(1)

    elif args.command == "publish":
        try:
            publish_test(ObjectId(settings.institute_id), args.test_key)
            print("Test published successfully.")
        except Exception as e:
            print(f"Publication failed: {e}")
            sys.exit(1)

    elif args.command == "unpublish":
        try:
            unpublish_test(ObjectId(settings.institute_id), args.test_key)
            print("Test unpublished successfully.")
        except Exception as e:
            print(f"Unpublication failed: {e}")
            sys.exit(1)

    elif args.command == "issue-claims":
        from app.services.auth import generate_claims
        import json
        try:
            claims = generate_claims(ObjectId(settings.institute_id), args.test_key)
            with open(args.out, "w", encoding="utf-8") as f:
                json.dump(claims, f, indent=2)
            os.chmod(args.out, 0o600)
            print(f"Issued {len(claims)} claims to {args.out}")
        except Exception as e:
            print(f"Issue claims failed: {e}")
            sys.exit(1)
    else:
        parser.print_help()
        sys.exit(1)

if __name__ == "__main__":
    main()
