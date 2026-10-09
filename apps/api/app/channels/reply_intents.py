"""
Intent matching for short WhatsApp / SMS replies.

Replies are matched against the *whole* message, never as substrings: "nahi"
contains "ha", "change" contains "ha", and "is she ok?" contains "ok". A
substring match would read those as yes / acknowledged.
"""
import re

# Punctuation and emoji become spaces; Devanagari letters and vowel signs stay.
_NON_WORD = re.compile(r"[^\w\sऀ-ॣ०-ॿ]")


def normalize_reply(text: str) -> str:
    """Lower-case, drop apostrophes, turn punctuation/emoji/danda into spaces, collapse spaces."""
    lowered = (text or "").lower().replace("'", "").replace("’", "")
    return " ".join(_NON_WORD.sub(" ", lowered).split())


# "Yes, save this reading" — includes the echo_confirmation button labels.
AFFIRMATIVE_REPLIES = frozenset({
    "yes", "y", "yes save", "save", "confirm", "correct", "ok", "okay",
    "haan", "han", "haa", "ha", "ji", "haan ji", "ji haan", "sahi", "sahi hai", "theek", "theek hai",
    "hoy", "ho", "barobar", "hoy barobar",
    "हाँ", "हां", "हा", "जी", "जी हाँ", "हाँ सहेजें", "सही", "सही है", "ठीक", "ठीक है",
    "होय", "हो", "बरोबर", "बरोबर आहे", "होय बरोबर आहे", "होय सेव्ह करा",
})

# "No, change it" — includes the echo_confirmation button labels.
NEGATIVE_REPLIES = frozenset({
    "no", "n", "nope", "change", "re enter", "reenter", "wrong", "not correct",
    "nahi", "nahin", "na", "galat", "badlo", "badla", "phir se",
    "नहीं", "नही", "ना", "गलत", "बदलें", "बदलो", "फिर से", "फिर से दर्ज करें",
    "नाही", "चूक", "बदला", "पुन्हा", "पुन्हा नोंदवा",
})

# A caregiver telling us they have checked on the patient.
CAREGIVER_ACK_REPLIES = frozenset({
    "ok", "okay", "yes", "1", "done", "checked", "ive checked", "i have checked", "i checked",
    "dekha", "dekh liya", "maine dekh liya", "baat kar li", "pahila", "pahile",
    "ठीक है", "देख लिया", "मैंने देख लिया", "मैंने बात कर ली", "बात कर ली",
    "पाहिले", "मी पाहिले", "मी चौकशी केली",
})


def is_affirmative(text: str) -> bool:
    return normalize_reply(text) in AFFIRMATIVE_REPLIES


def is_negative(text: str) -> bool:
    return normalize_reply(text) in NEGATIVE_REPLIES


def is_caregiver_ack(text: str) -> bool:
    return normalize_reply(text) in CAREGIVER_ACK_REPLIES
