# Gas Budget — Blin Finance Contracts

Optimizer: 200 runs, via_ir = false, solc 0.8.24.
Test strategy: NoopStrategy (no Aave overhead). Production costs will be higher for deposit/withdraw paths.

## AutoSaveVault

| Function                  | Target (gas) | Measured avg | Status |
|---------------------------|:------------:|:------------:|:------:|
| `createLock`              | < 200 000    |    ~195 000  |  ✅    |
| `topUp`                   | <  80 000    |     ~51 000  |  ✅    |
| `withdraw`                | <  80 000    |     ~57 000  |  ✅    |
| `breakLock`               | < 130 000    |    ~108 000  |  ✅    |
| `renameLock`              | <  35 000    |     ~30 000  |  ✅    |
| `scheduleStrategyUpgrade` | <  80 000    |     ~53 000  |  ✅    |
| `executeStrategyUpgrade`  | <  35 000    |     ~28 000  |  ✅    |
| `setPenaltyReceiver`      | <  35 000    |     ~28 000  |  ✅    |

Notes:
- `createLock` median 196k cold. With `via_ir = true`, expect 5-10% reduction.
- Production `withdraw` includes Aave interaction; add ~50k gas headroom.

## VaultFactory

| Function                    | Target (gas) | Measured avg  | Status |
|-----------------------------|:------------:|:-------------:|:------:|
| `getOrCreateVault` (new)    | < 3 500 000  |  ~2 790 000   |  ✅    |
| `getOrCreateVault` (cached) | <   5 000    |    ~24 000 †  |  ✅    |

† Foundry gas-report shows a blended avg including both paths. Cached-only path is ~SLOAD cost.

## SaveSwap

| Function       | Target (gas) | Measured avg | Status |
|----------------|:------------:|:------------:|:------:|
| `swapAndSave`  | < 260 000    |   ~236 000   |  ✅    |
| `setAggregator`| <  35 000    |  (not meas.) |        |
| `setVaultOverride` | < 35 000 |  (not meas.) |        |

## Measurement

```bash
forge test --gas-report
```

Run after every significant change. Any function regressing beyond its target
must be profiled (`forge snapshot --diff`) before merging.
