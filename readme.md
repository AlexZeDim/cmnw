# Commands

### C || CHAR

This commands allows you receive information about selected character or find all characters with exact name across all avaliable realms.
Arguments for this command are and case and locale insensitive.

Gives you information about selected character:
```
CHAR блюрателла@гордунни
```

Find all character will the exact name *Блюрателла* across all realms:
```
C блюрателла
```

### A || ALT || ALTS

Command allows you to find all other characters of certain player via **OSINT DB** The matching pattern based on two different hash values.

- Hash A match guarantees you with 100% confidence that all characters belongs to one player.
- Hash B match ensures that characters could belong to one player with 50+ % confidence

You are available to search by both parameters:

Find all characters that belong to *Блюрателла* from *Gordunni-EU*
```
ALTS блюрателла@гордунни
```

Search for characters with hash `f97efc28` across Hash A and Hash B fields.
```
A f97efc28
```

*Hash values are dynamic properties. They changed on day-to-day basis. There is not reason to remember them.*

### G || GUILD

Allows you to receive information about guild and it's members:
```
G депортация@гордунни
```
If you want to find a guild a certain name across all realms use this command:
```
GUILD депортация
```

### CON || CONTRACT

For more information about contracts check this *link* .

Provides historical market information about **Day/Week/Month** contract with following code:
```
CON zin'anthid-01.J@gordunni
```
You could also use `TICKER` item names or `connected_realm_id` for realms if you know them for sure:
```
CONTRACT ZNTD@1602
```

### XSS CURVE || XRS CURVE

Gives a represent vision of Cross Realm operations beetween different servers.

- *in progress*

### EVA

Evaluate certain derivative, depends on **YLD**.

- *in progress*