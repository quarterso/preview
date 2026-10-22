# Settlement

> Read a bank or card statement back, and see what settled as approved, what settled differently, and what left without Quarter.

Quarter checks a payment before it goes out. Settlement closes the loop afterwards: send the statement from your bank or card program, and each line of money going out is matched to what Quarter released.

| Result | What it means |
| --- | --- |
| `settled` | The line matched a released payment, for the same amount. |
| `different` | The line matched a released payment, for another amount. `expected_amount` is what was approved. |
| `unapproved` | Money left that matched nothing Quarter released: a payment made outside Quarter, a fee, or something to look at. |
| missing | A payment Quarter released 5 to 45 days around the statement that no statement has shown yet. |

## How a line is matched

1. The release code of a payment check, pasted into the wire memo or bank reference.
2. A check's number, on a check run.
3. A whole file posted as one debit of its total, as banks often post an ACH file.
4. The same amount to a payee the line names, or the only released payment of that amount.

Each payment is matched once, across every statement, so the same debit on two statements is never counted twice. Money coming in is left out.

## Formats

- `csv`: a date column, and either one amount column with money out negative, or separate debit and credit columns. A description and a reference column are read when present.
- `bai2`: the bank format. Type codes 400 to 699 are read as money out. Funds types 0, 1, 2, S, V and Z are read; ask the bank for one of them.

`POST /v1/statements` with `format`, `file` and an optional `name` reads a statement, for an approver. `GET /v1/statements` lists them, and `GET /v1/statements/{statement}` returns one with each line and the payments still missing. The same file twice is refused with `409 duplicate_statement`.
