from pwdlib import PasswordHash

# Argon2id with the library's recommended settings: slow on purpose (about 0.1 s), so a stolen list of hashes is hard to guess against.
_hasher = PasswordHash.recommended()

MIN_LENGTH = 12
MAX_LENGTH = 128  # a limit on what is hashed, so a huge "password" cannot be used to keep the server busy


class WeakPassword(ValueError):
    """The password does not meet the rules; the message can be shown."""


def check_policy(password: str, email: str | None = None) -> None:
    """Length is what counts (a phrase of a few words is fine); the password must not be the account's own email."""
    if len(password) < MIN_LENGTH:
        raise WeakPassword(f"The password must be at least {MIN_LENGTH} characters long.")
    if len(password) > MAX_LENGTH:
        raise WeakPassword(f"The password must be at most {MAX_LENGTH} characters long.")
    if password.strip() != password:
        raise WeakPassword("The password must not start or end with a space.")
    if len(set(password)) < 5:
        raise WeakPassword("The password is too repetitive.")
    if email and password.lower() in (email.lower(), email.lower().partition("@")[0]):
        raise WeakPassword("The password must not be the email address.")


def hash_password(password: str) -> str:
    return _hasher.hash(password)


# What is checked when the email has no account, so a refusal takes as long either way and its timing does not tell which emails have one.
DUMMY_HASH = _hasher.hash("a password nobody has, hashed only to take the time")


def verify_password(password: str, password_hash: str) -> tuple[bool, str | None]:
    """Whether the password is right, and a newer hash of it where the stored one was made with older settings (to be saved)."""
    return _hasher.verify_and_update(password[: MAX_LENGTH + 1], password_hash)
