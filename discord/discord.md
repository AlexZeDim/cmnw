# Commands

**Attention! All commands names are CASE SENSITIVE!**

### CHAR [name]@[realm]

This command allows you to receive information about selected character or find all characters with exact name across all available realms.
Arguments for this command are case-insensitive.

```text
CHAR блюрателла@гордунни
```

### WHOAMI

Shows your discord username and ID.

```text
User: whoami
Bot: Your username: AlexZeDim. Your ID: 6456456456456456.
```

### MEMBERS

Returns a pretty print JSON file with all guild / discord channel's member names and discord IDs.

```text
User: members
Bot: Name: Depo. Total members: 254. Attached files: members.json
```

### ITEM [item]@[realm]

Will send you first 30 valuations (in ascending order) for a selected game item. Item can be queried via it's ID (_number_), or via a name (any string, any locale, case-insensitive)
or even TICKER (FLASK.INT). So does for the realm argument. Please notice that item should have an asset class for being valuated. And if it doesn't, the command will return nothing,

```text
EVA FLASK.INT@GORDUNNI
```

### HASH A || B || F [query]

Allows you to find no more than 15 (_available_) alternative characters (twinks) in OSINT-DB across different realms.

Requires a query parameter, which can be a hash string `f97efc28`.

```text
hash a@f97efc28
```

> Remember, that match by any of this hash values separately doesn't guarantee that a selected character would belong to one identity.
> It only gives you a certain level of confidence. Also, OSINT-DB doesn't have all the game characters.
> So if you want a maximum level of confidence, please use argument **ALL** because only it gives you almost 100% confidence level result.

More information about how hash algorithm working you could found [here](http://ya.ru).

### DIRECT@[ID][-m 50] [-t 60][-d 10] [-s hex || base64][-r]

Opens a direct channel between you and certain user, by his || her snowflake discord ID. Delivers the message, like it has been sent from the bot itself, without compromising the sender.

Support various arguments:

- -m (messages) — amount of messages that should be delivered between you and receiver. By default, it equals 50.
- -t (time) — amount of seconds. For this amount of time, the message window will open with the receiver. Default value is 1 minute.
- -d (destruction: **_optional_**) — amount of seconds. Enabling self-destruction timer for every message that would be delivered.
- -s (secured: **_optional_**) — encode the original message with **hex** or **base64**. The receiver won't have any notification, so make sure that he will understand your message.
  Or intellectually capable to decode it. All messages are unsecured by default.
- -r (reply: **_optional_**) — Allows the receiver to reply at your messages back.
- -exit or -close — After the following command, instantly close the message window between you and the receiver.

Sender side via direct messages to the bot:

```text
User: direct@4536546546875698 -m 50 -t 60 -d 10 -s hex
Bot: Connection established: 4536546546875698 for $60s
User: Please deliver every message here..
User: ..and below to the Receiver
User: -exit (afterwards)
Bot: Connection closed with 4536546546875698. You send 2 messages.
```

Receiver (Discord ID: 4536546546875698) will see:

```text
Bot: 506c6561 73652064 656c6976 65722065 76657279 206d6573 73616765 20686572 652e2e
Bot: 2e2e616e 64206265 6c6f7720 746f2074 68652052 65636569 766572
```

With -d 10 enables, all message on the receiver side will be deleted in 10 seconds.

Check this article for more [examples](https://ya.ru).
