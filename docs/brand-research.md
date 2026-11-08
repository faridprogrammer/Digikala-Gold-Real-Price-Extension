# Digikala gold brand review

Reviewed on November 8, 2026 using web search and extracted Digikala pages. BrowserOS neo was unavailable; the installed extension was not exercised against a live browser. This is a review of accessible listings, not an exhaustive catalog audit.

## Sources and decisions

- [Digikala bullion category](https://www.digikala.com/search/category-bullion/): lists Tokeniko GHA-0.5, GON-1 and GTW-2.5 as 24-karat bars. Add a 995 default only for Tokeniko gold bars whose title explicitly says 24 karats. The manufacturer independently confirms this product line's purity.
- [Digikala Tokeniko GHA-0.5](https://www.digikala.com/product/dkp-18567127/شمش-طلا-24-عیار-توکنیکو-مدل-gha-05/): its introduction and purity specification both state 995. The title alone says 24 karats, so the new rule covers pages where numerical specifications have not loaded.
- [Tokeniko official one-gram bar](https://tokeniko.com/products/gold-bar-1gram-24carat) and [official catalog](https://tokeniko.com/products): identify Tokeniko's own 24-karat gold bars as 995. Do not apply the default to silver, plated products, jewelry, similarly named brands, or titles lacking a karat label.

Other newly checked brands in the Digikala category already work through explicit title facts:

| Brand | Explicit listing purity | Existing interpretation |
| --- | --- | --- |
| ققنوس | 18 karats | 750 |
| ونوس گلد | 18 karats | 750 |
| ونوس | 18 karats | 750 |
| زربد | 18 karats | 750 |
| طلای آمیتیس | 18 karats | 750 |
| آرسس | 18 karats | 750 |
| سوت | 18 karats | 750 |
| کسری | 995 | 995 |

No brand-wide defaults were added for these eight brands. Their listed purity is already explicit; missing purity on another product remains unresolved. Kasra's purity was checked through its category title, not its individual product specifications.

## Verification

Parser tests cover Tokeniko across Latin, Persian and Arabic digits, decorative tatweel characters, agreement/conflict with explicit specifications, 18-karat titles, unknown lines and misleading model numbers. Additional brand tests check explicit 18-karat and 995 titles without inventing defaults. A synthetic DOM integration test checks the Tokeniko result with a selected total weight and no numerical purity specification. These DOM tests are not archived live product pages.
