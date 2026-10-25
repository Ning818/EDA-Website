"""The accounts of the admin, from the command line (there is no sign-up): run from the backend folder.

    python -m app.manage create-user --email ada@example.org --name "Ada Lovelace" --role admin
    python -m app.manage set-password --email ada@example.org
    python -m app.manage deactivate --email ada@example.org      (activate: the other way)
    python -m app.manage list-users

The password is asked for on the terminal (not shown, not kept in the shell's history), never given as an argument.
"""
import argparse
import getpass
import sys
from collections.abc import Callable

from app.db.session import SessionLocal
from app.models.user import Role
from app.services.users import UserError, create_user, get_by_email, set_password


def _ask_password(prompt: Callable[[str], str]) -> str:
    first = prompt("Password: ")
    if first != prompt("Password again: "):
        raise UserError("The two passwords are not the same.")
    return first


def run(argv: list[str], prompt: Callable[[str], str] = getpass.getpass, out=print) -> int:
    parser = argparse.ArgumentParser(prog="python -m app.manage", description="The accounts of the admin.")
    commands = parser.add_subparsers(dest="command", required=True)

    create = commands.add_parser("create-user", help="make an account")
    create.add_argument("--email", required=True)
    create.add_argument("--name", required=True)
    create.add_argument("--role", choices=[role.value for role in Role], default=Role.EDITOR.value)
    for name, help_text in (("set-password", "give an account a new password (ends its logins)"), ("activate", "switch an account on"), ("deactivate", "switch an account off")):
        commands.add_parser(name, help=help_text).add_argument("--email", required=True)
    commands.add_parser("list-users", help="list the accounts")

    args = parser.parse_args(argv)
    try:
        with SessionLocal() as db:
            if args.command == "create-user":
                user = create_user(db, args.email, args.name, _ask_password(prompt), Role(args.role))
                out(f"Made the {user.role} account {user.email}.")
            elif args.command == "list-users":
                from sqlalchemy import select

                from app.models.user import User

                for user in db.scalars(select(User).order_by(User.id)):
                    out(f"{user.id}\t{user.email}\t{user.name}\t{user.role}\t{'active' if user.is_active else 'switched off'}")
            else:
                user = get_by_email(db, args.email)
                if user is None:
                    raise UserError("There is no account with that email.")
                if args.command == "set-password":
                    set_password(db, user, _ask_password(prompt))
                    out(f"New password set for {user.email}; its logins have ended.")
                else:
                    user.is_active = args.command == "activate"
                    db.commit()
                    out(f"{user.email} is {'active' if user.is_active else 'switched off'}.")
    except UserError as error:
        print(str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(run(sys.argv[1:]))
