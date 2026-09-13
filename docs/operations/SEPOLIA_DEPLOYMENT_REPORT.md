# Sepolia deployment report

## Result

The marketplace's seven-contract core is live on public Sepolia. Deployment, contract bytecode smoke checks, MockVND seeding and event indexing completed successfully on 13 September 2026.

- Chain: Ethereum Sepolia (`11155111`)
- Dedicated test deployer: [`0x0528f92525E8cBEA406D291961E9175949d5F239`](https://sepolia.etherscan.io/address/0x0528f92525E8cBEA406D291961E9175949d5F239)
- Deployment start block: [`11695984`](https://sepolia.etherscan.io/block/11695984)
- Funding: [`0x31291191d3bc91a42fbdc0ac20ab2d88166a51b33ba4b4c62591aa9da4d9f4e6`](https://sepolia.etherscan.io/tx/0x31291191d3bc91a42fbdc0ac20ab2d88166a51b33ba4b4c62591aa9da4d9f4e6)
- MockVND seed: [`0xe595df1c4013aeb2be60943371c544a07bb36bb6f9c99f9c41a8015c09ec54a1`](https://sepolia.etherscan.io/tx/0xe595df1c4013aeb2be60943371c544a07bb36bb6f9c99f9c41a8015c09ec54a1)
- Indexed evidence: 19 unique events through finalized block `11696063`

## Contracts

| Contract | Sepolia address |
| --- | --- |
| MockVND | [`0x35Db3aAA284321Db09a4c189CA53468b0a726295`](https://sepolia.etherscan.io/address/0x35Db3aAA284321Db09a4c189CA53468b0a726295) |
| AssetRegistry | [`0x3ec95E112D74112f0401c60f0703414f43ae5cf8`](https://sepolia.etherscan.io/address/0x3ec95E112D74112f0401c60f0703414f43ae5cf8) |
| CommunityVoting | [`0xbdBf6211Ae3f09F44604492581f5a5f5aAceA9B3`](https://sepolia.etherscan.io/address/0xbdBf6211Ae3f09F44604492581f5a5f5aAceA9B3) |
| CompatibilityRegistry | [`0x9d3207CD317Ce790347dCBe2d02f086afC16e41f`](https://sepolia.etherscan.io/address/0x9d3207CD317Ce790347dCBe2d02f086afC16e41f) |
| SkinEntitlement1155 | [`0x4e1CDE11fAeB5f73dc8e9690e11cD9118855B9A9`](https://sepolia.etherscan.io/address/0x4e1CDE11fAeB5f73dc8e9690e11cD9118855B9A9) |
| PrimaryAuction | [`0x368a33013A12b729994B03b82E8168D6877Cf870`](https://sepolia.etherscan.io/address/0x368a33013A12b729994B03b82E8168D6877Cf870) |
| SecondaryMarketplace | [`0x8426FB58e4389811C57f3Fe6c23114dbb2b7bd7A`](https://sepolia.etherscan.io/address/0x8426FB58e4389811C57f3Fe6c23114dbb2b7bd7A) |

## Verified behavior

- Runtime bytecode exists at all seven addresses.
- AssetRegistry emitted and retained the CommunityVoting link.
- Deployment and configuration emitted public role and authorization events.
- The deployer received 1,000 MockVND in the public seed transaction.
- The Sepolia indexer resumed from the deployment block, de-duplicated events and persisted its cursor.
- The frontend evidence route reads the indexed Sepolia dataset and exposes explorer transaction links.

## Completion boundary

This proves a working public on-chain foundation, not a production security audit. Etherscan source verification remains pending until an API key is supplied. Hosted PostgreSQL/IPFS, public web hosting, monitoring and distinct role wallets remain optional external setup. Because distinct actor addresses were not supplied, the deployment currently assigns operational roles to the dedicated deployer; no claim is made that the complete multi-wallet business journey has run on Sepolia.
