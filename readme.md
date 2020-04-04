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

- Hash A match guarantees you 100% confidence that characters belongs to one player.
- Hash B match ensures that characters could belong to one player with 50+ % confidence

You are available to search by both parameters:

Find all characters that belong to *Блюрателла* from *Gordunni-EU*
```
ALTS блюрателла@гордунни
```

Search for all matchings with hash `TEST` across Hash A and Hash B
```
A TEST
```
