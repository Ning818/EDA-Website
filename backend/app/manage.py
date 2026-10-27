"""The accounts of the admin, from the command line: for the developer, and for the first account before there is an admin app to make the others. Run from the backend folder.

    python -m app.manage create-user --email ada@example.org --name "Ada Lovelace" --preset administrative
    python -m app.manage grant --email ada@example.org --area theme [--theme vlsi-cad]    (no --theme: every theme)
    python -m app.manage revoke --email ada@example.org --area theme
    python -m app.manage set-password --email ada@example.org
    python -m app.manage deactivate --email ada@example.org      (activate: the other way)
    python -m app.manage list-users

A preset gives the grants of one of the three kinds of people who keep the site: administrative, theme-owner, projects-owner (app/services/grants.py). An account made without
a preset can log in and may do nothing. The password is asked for on the terminal (not shown, not kept in the shell's history), never given as an argument.
"""
import argparse
import getpass
import sys
from collections.abc import Callable

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.grant import Area
from app.models.theme import Theme
from app.models.user import User
from app.services.grants import GrantError, Preset, grant, revoke
from app.services.users import UserError, create_user, get_by_email, set_password


def _ask_password(prompt: Callable[[str], str]) -> str:
    first = prompt("Password: ")
    if first != prompt("Password again: "):
        raise UserError("The two passwords are not the same.")
    return first


def _grants_text(user: User) -> str:
    parts = []
    for item in user.grants:
        if item.area != Area.THEME:
            parts.append(item.area)
        else:
            parts.append(f"theme({item.theme.slug if item.theme else 'all'})")
    return ", ".join(parts) or "(none)"


def run(argv: list[str], prompt: Callable[[str], str] = getpass.getpass, out=print) -> int:
    parser = argparse.ArgumentParser(prog="python -m app.manage", description="The accounts of the admin.")
    commands = parser.add_subparsers(dest="command", required=True)

    create = commands.add_parser("create-user", help="make an account")
    create.add_argument("--email", required=True)
    create.add_argument("--name", required=True)
    create.add_argument("--preset", choices=[preset.value for preset in Preset], default=None, help="the grants to give (none: the account may do nothing)")
    for name in ("grant", "revoke"):
        change = commands.add_parser(name, help=f"{name} a grant")
        change.add_argument("--email", required=True)
        change.add_argument("--area", required=True, choices=[area.value for area in Area])
        change.add_argument("--theme", default=None, help="for the area theme: the theme's slug (no --theme: every theme)")
    for name, help_text in (("set-password", "give an account a new password (ends its logins)"), ("activate", "switch an account on"), ("deactivate", "switch an account off")):
        commands.add_parser(name, help=help_text).add_argument("--email", required=True)
    commands.add_parser("list-users", help="list the accounts")

    args = parser.parse_args(argv)
    try:
        with SessionLocal() as db:
            if args.command == "create-user":
                preset = Preset(args.preset) if args.preset else None
                user = create_user(db, args.email, args.name, _ask_password(prompt), preset)
                out(f"Made the account {user.email} with {_grants_text(user)}.")
            elif args.command == "list-users":
                for user in db.scalars(select(User).order_by(User.id)):
                    out(f"{user.id}\t{user.email}\t{user.name}\t{_grants_text(user)}\t{'active' if user.is_active else 'switched off'}")
            else:
                user = get_by_email(db, args.email)
                if user is None:
                    raise UserError("There is no account with that email.")
                if args.command in ("grant", "revoke"):
                    theme_id = None
                    if args.theme:
                        theme = db.scalar(select(Theme).where(Theme.slug == args.theme))
                        if theme is None:
                            raise UserError("There is no theme with that slug.")
                        theme_id = theme.id
                    area = Area(args.area)
                    changed = (grant if args.command == "grant" else revoke)(db, user, area, theme_id)
                    db.commit()
                    out(f"{user.email}: {args.command} {args.area}{' ' + args.theme if args.theme else ''}: {'done' if changed else 'nothing to change'}.")
                elif args.command == "set-password":
                    set_password(db, user, _ask_password(prompt))
                    out(f"New password set for {user.email}; its logins have ended.")
                else:
                    user.is_active = args.command == "activate"
                    db.commit()
                    out(f"{user.email} is {'active' if user.is_active else 'switched off'}.")
    except (UserError, GrantError) as error:
        print(str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(run(sys.argv[1:]))
