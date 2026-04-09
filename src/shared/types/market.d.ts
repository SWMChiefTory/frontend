export type Market = "KOREA" | "GLOBAL";

export type MarketResponse = {
  market: Market;
  country_code: string;
}

export type MarketConfig = {
  market: Market;
  countryCode: string;
  webviewPath: "/ko" | "/en";
}
