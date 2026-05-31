# Overview

## Purpose

This specification defines the frontend implementation for the Relay Coding product. It treats the backend API contract, realtime event contract, and backend-owned specs as the source of truth for user-visible behavior.

The frontend is responsible for:

- authentication entry points
- AI chat driven room creation and invitation flows
- waiting-room state inside the main chat screen
- real-time relay coding gameplay after the game starts

This document set consolidates and translates the authoritative frontend design currently maintained in:

- [`docs/etc/api-spec.md`](/Users/imhyeon/Documents/GitHub/frontend/docs/etc/api-spec.md)
- [`docs/etc/tech-spec.md`](/Users/imhyeon/Documents/GitHub/frontend/docs/etc/tech-spec.md)

## Scope

Included scope:

- sign up
- log in
- access token refresh
- initial main page state hydration
- current room lookup for the signed-in user
- invitation lookup for the signed-in user
- AI chat session lookup
- AI chat message lookup and submission
- AI chat driven room creation
- AI chat driven invitation acceptance and rejection
- waiting-room participant state
- game start request
- gameplay screen
- current mission hint lookup
- realtime participant, code, turn, and mission synchronization

Excluded scope:

- ranking
- statistics
- retrospective screens
- payments
- shop
- achievements
- HTTP code execution APIs
- HTTP AI debugging APIs

## Core Product Rules

- The pre-game experience stays on `/main`. There is no separate lobby page before gameplay.
- The gameplay screen opens only after a realtime server event confirms that the game has started.
- A single user belongs to at most one waiting room at a time.
- The frontend interprets backend contracts as authoritative and should not invent fallback behavior when the spec is explicit.

## Primary Domain Terms

- `AI chat session`: the persistent conversation context between the user and the assistant
- `current room`: the single active waiting room associated with the current user
- `room waiting state`: the participant and readiness state shown inside the main chat UI before gameplay
- `mission state`: the current mission metadata delivered by realtime events
- `turn state`: the current playable turn, timer, and active player information
- `mission result`: the final end-of-game evaluation payload
