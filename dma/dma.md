# DMA

 - Items
 - Auctions
 - Golds
 - Contracts
 - Valuations
 - WoWToken

## Items

Items collection is a fundamental part of DMA. Almost every function based on it. 
It doesn't have an endpoint directly, but instead, this data provides in every endpoint request.

Most of the item's data are from Battle.net API, but not all of them. 
And the most sensitive part has usually been imported via `*.csv` files or added in sophisticated way.

Data sources:

 - Battle.net API
 - WoW.tools (*csv import*)
 - User defined (*csv import*)
 
## Auctions

The spine of this world. Run cron task evey 10 minutes to a scan an updated market data. 
It is provided by `getAuctionHouseData` Battle.net API endpoint. Contracts and evaluations data have been derived from the `auctions` collection.

#### Functions

There are two basic functions for working with collection data itself:
 - auctionsData (**item_id:** *Number*, **connected_realm_id:** *Number*) — returns array of orders data for selected item and realm on the latest timestamp.
 - auctionsQuotes (**item_id:** *Number*, **connected_realm_id:** *Number*) — returns aggregated object of quotes for selected item and realm on latest timestamp.

## Gold

Gold data collection is precisely the same as auction data, except it has `sellers` attribute, instead of `orders` and only one basic function.
Data feed has been provided by the hugest ru-WoW gold exchange website: [FunPay.ru](https://funpay.ru). 

#### Functions

 - goldsData (**connected_realm_id:** *Number*) — returns array of orders for a selected realm on the latest timestamp.

## Contracts

Contracts is name of a historical pricing data management system. Quotes are indexing every hour by `tod.js` 
This data formed only for the latest expansion `COMMODITY` items, which have `unit_price` field and gold data. The result information have been stored in `contracts` collection.
IDs formed by `item_id-timestamp@connected_realm` pattern.

 #### Endpoints
 
 - INTRADAY / TOD
 - CURRENT WEEK / WEEK
 - CURRENT MONTH / MONTH
 - YESTERDAY / YTD
 - LAST WEEK / LASTWEEK
 - LAST MONTH / LASTMONTH
 - FROM : TO / CUSTOM


## Valuations

Any item. Any realm. Any time. The crown diamond of DMA.

Version 3, codename: EVA is an evaluation algorithm capable to find a cheapest-to-delivery way to be made for a derivative item and its value (quene cost, nominal prices) within a polynomial time.

What else to say? You want it. We have it.

 #### To be remembered:
  - Version 2. Codename: Turing.
  - Version 1. Codename: Brutus.
