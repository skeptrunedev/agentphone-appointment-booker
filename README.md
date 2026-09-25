# AgentPhone appointment booker

An outbound phone agent that uses [AgentPhone](https://agentphone.ai) to call a business, have a constrained appointment conversation, and save the call details and transcript locally.

## Safety boundaries

- The agent identifies itself as an AI assistant.
- Every call requires a task file with approved time windows and booking authority.
- It never provides payment, insurance identifiers, date of birth, passwords, or detailed medical history.
- It cannot accept an appointment outside the approved windows.
- It saves facts only after the office confirms them.
- Audio recording is disabled on every call; AgentPhone still provides a transcript.

## Account prerequisites

1. An [AgentPhone](https://agentphone.ai) account.
2. An AgentPhone API key, agent ID, and assigned phone number.
3. Sufficient AgentPhone balance or an eligible payment method for outbound calls.

## Configure

```sh
cp .env.example .env
cp task.example.json task.json
```

Fill `.env`:

| Variable | Value |
|---|---|
| `AGENTPHONE_API_KEY` | AgentPhone dashboard API key (`sk_live_...`) |
| `AGENTPHONE_AGENT_ID` | AgentPhone agent ID (`agt_...`) |

Edit `task.json` for each call. `bookIfAvailable: false` makes the call information-only. `maxTotalPrice` is an authorization ceiling, not permission to provide payment.

## Run

```sh
pnpm install
pnpm call +14155550123 --task task.json
```

The destination must use E.164 format. The command starts the hosted call, waits for it to finish, prints the transcript, and writes the full result to `call-results/`.

## Results

Each call writes a private JSON file under `call-results/` containing:

- call task and destination;
- transcript fragments from the office and assistant;
- AgentPhone's final call status and metadata;
- the complete transcript returned by AgentPhone.

`call-results/`, `.env`, and audio diagnostics are excluded from git.

## Production notes

This is a single-user command-line tool. Before exposing it as a multi-user product, add durable idempotency, user authentication, persistent task state, retry policy, spend limits, monitoring, and recipient consent controls. Recording is deliberately disabled; do not enable it unless every applicable party has received any legally required notice and consented.

## License

MIT. See [`LICENSE`](LICENSE).
