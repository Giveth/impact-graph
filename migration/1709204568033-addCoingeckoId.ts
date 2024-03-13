import { MigrationInterface, QueryRunner } from 'typeorm';
import config from '../src/config';
import { Token } from '../src/entities/token';
import { ChainType } from '../src/types/network';

type TokenData = {
  networkId: number;
  address: string;
  symbol: string;
  chainType: ChainType;
  coingeckoId: string;
};

const productionTokensData: TokenData[] = [
  {
    networkId: 42220,
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'CELO',
    chainType: ChainType.EVM,
    coingeckoId: 'celo',
  },
  {
    networkId: 1,
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    chainType: ChainType.EVM,
    coingeckoId: 'ethereum',
  },
  {
    networkId: 1,
    address: '0x7d1afa7b718fb893db30a3abc0cfc608aacfebb0',
    symbol: 'MATIC',
    chainType: ChainType.EVM,
    coingeckoId: 'matic-network',
  },
  {
    networkId: 100,
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'XDAI',
    chainType: ChainType.EVM,
    coingeckoId: 'xdai',
  },
  {
    networkId: 1,
    address: '0x900db999074d9277c5da2a43f252d74366230da0',
    symbol: 'GIV',
    chainType: ChainType.EVM,
    coingeckoId: 'giveth',
  },
  {
    networkId: 100,
    address: '0x4f4f9b8d5b4d0dc10506e5551b0513b61fd59e75',
    symbol: 'GIV',
    chainType: ChainType.EVM,
    coingeckoId: 'giveth',
  },
  {
    networkId: 61,
    address: '0x82a618305706b14e7bcf2592d4b9324a366b6dad',
    symbol: 'WETC',
    chainType: ChainType.EVM,
    coingeckoId: 'wetc-hebeswap',
  },
  {
    networkId: 100,
    address: '0x9c58bacc331c9aa871afd802db6379a98e80cedb',
    symbol: 'GNO',
    chainType: ChainType.EVM,
    coingeckoId: 'gnosis',
  },
  {
    networkId: 100,
    address: '0x6a023ccd1ff6f2045c3309768ead9e68f978f6e1',
    symbol: 'WETH',
    chainType: ChainType.EVM,
    coingeckoId: 'weth',
  },
  {
    networkId: 1,
    address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    symbol: 'WETH',
    chainType: ChainType.EVM,
    coingeckoId: 'weth',
  },
  {
    networkId: 1,
    address: '0x111111111117dc0aa78b770fa6a738034120c302',
    symbol: '1INCH',
    chainType: ChainType.EVM,
    coingeckoId: '1inch',
  },
  {
    networkId: 1,
    address: '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9',
    symbol: 'AAVE',
    chainType: ChainType.EVM,
    coingeckoId: 'aave',
  },
  {
    networkId: 137,
    address: '0xd6df932a45c0f255f85145f286ea0b292b21c90b',
    symbol: 'AAVE',
    chainType: ChainType.EVM,
    coingeckoId: 'aave',
  },
  {
    networkId: 137,
    address: '0xe0b52e49357fd4daf2c15e02058dce6bc0057db4',
    symbol: 'agEUR',
    chainType: ChainType.EVM,
    coingeckoId: 'ageur',
  },
  {
    networkId: 100,
    address: '0x3a97704a1b25f08aa230ae53b352e2e72ef52843',
    symbol: 'AGVE',
    chainType: ChainType.EVM,
    coingeckoId: 'agave-token',
  },
  {
    networkId: 1,
    address: '0xdbdb4d16eda451d0503b854cf79d55697f90c8df',
    symbol: 'ALCX',
    chainType: ChainType.EVM,
    coingeckoId: 'alchemix',
  },
  {
    networkId: 1,
    address: '0xff20817765cb7f73d4bde2e66e067e58d11095c2',
    symbol: 'AMP',
    chainType: ChainType.EVM,
    coingeckoId: 'amp-token',
  },
  {
    networkId: 1,
    address: '0x8290333cef9e6d528dd5618fb97a76f268f3edd4',
    symbol: 'ANKR',
    chainType: ChainType.EVM,
    coingeckoId: 'ankr',
  },
  {
    networkId: 137,
    address: '0x101a023270368c0d50bffb62780f4afd4ea79c35',
    symbol: 'ANKR',
    chainType: ChainType.EVM,
    coingeckoId: 'ankr',
  },
  {
    networkId: 1,
    address: '0xa117000000f279d81a1d3cc75430faa017fa5a2e',
    symbol: 'ANT',
    chainType: ChainType.EVM,
    coingeckoId: 'aragon',
  },
  {
    networkId: 1,
    address: '0x0b38210ea11411557c13457d4da7dc6ea731b88a',
    symbol: 'API3',
    chainType: ChainType.EVM,
    coingeckoId: 'api3',
  },
  {
    networkId: 1,
    address: '0x71590d4ed14d9cbacb2cff8abf919ac4d22c5b7b',
    symbol: 'ASH',
    chainType: ChainType.EVM,
    coingeckoId: 'ash',
  },
  {
    networkId: 137,
    address: '0xac51C4c48Dc3116487eD4BC16542e27B5694Da1b',
    symbol: 'ATOM',
    chainType: ChainType.EVM,
    coingeckoId: 'cosmos',
  },
  {
    networkId: 1,
    address: '0x18aaa7115705e8be94bffebde57af9bfc265b998',
    symbol: 'AUDIO',
    chainType: ChainType.EVM,
    coingeckoId: 'audius',
  },
  {
    networkId: 1,
    address: '0xbb0e17ef65f82ab018d8edd776e8dd940327b28b',
    symbol: 'AXS',
    chainType: ChainType.EVM,
    coingeckoId: 'axie-infinity',
  },
  {
    networkId: 137,
    address: '0x9a71012b13ca4d3d0cdc72a177df3ef03b0e76a3',
    symbol: 'BAL',
    chainType: ChainType.EVM,
    coingeckoId: 'balancer',
  },
  {
    networkId: 1,
    address: '0xba100000625a3754423978a60c9317c58a424e3d',
    symbol: 'BAL',
    chainType: ChainType.EVM,
    coingeckoId: 'balancer',
  },
  {
    networkId: 1,
    address: '0x2d94aa3e47d9d5024503ca8491fce9a2fb4da198',
    symbol: 'BANK',
    chainType: ChainType.EVM,
    coingeckoId: 'bankless-dao',
  },
  {
    networkId: 1,
    address: '0x0d8775f648430679a709e98d2b0cb6250d2887ef',
    symbol: 'BAT',
    chainType: ChainType.EVM,
    coingeckoId: 'basic-attention-token',
  },
  {
    networkId: 137,
    address: '0xfbdd194376de19a88118e84e279b977f165d01b8',
    symbol: 'BIFI',
    chainType: ChainType.EVM,
    coingeckoId: 'beefy-finance',
  },
  {
    networkId: 1,
    address: '0x1f573d6fb3f13d689ff844b4ce37794d79a7ff1c',
    symbol: 'BNT',
    chainType: ChainType.EVM,
    coingeckoId: 'bancor',
  },
  {
    networkId: 1,
    address: '0x0391d2021f89dc339f60fff84546ea23e337750f',
    symbol: 'BOND',
    chainType: ChainType.EVM,
    coingeckoId: 'barnbridge',
  },
  {
    networkId: 1,
    address: '0x5dd57da40e6866c9fcc34f4b6ddc89f1ba740dfe',
    symbol: 'BRIGHT',
    chainType: ChainType.EVM,
    coingeckoId: 'bright-token',
  },
  {
    networkId: 100,
    address: '0x83ff60e2f93f8edd0637ef669c69d5fb4f64ca8e',
    symbol: 'BRIGHT',
    chainType: ChainType.EVM,
    coingeckoId: 'bright-token',
  },
  {
    networkId: 1,
    address: '0xb683d83a532e2cb7dfa5275eed3698436371cc9f',
    symbol: 'BTU',
    chainType: ChainType.EVM,
    coingeckoId: 'btu-protocol',
  },
  {
    networkId: 1,
    address: '0xaaaebe6fe48e54f431b0c390cfaf0b017d09d42d',
    symbol: 'CEL',
    chainType: ChainType.EVM,
    coingeckoId: 'celsius-degree-token',
  },
  {
    networkId: 42220,
    address: '0xd8763cba276a3738e6de85b4b3bf5fded6d6ca73',
    symbol: 'cEUR',
    chainType: ChainType.EVM,
    coingeckoId: 'celo-euro',
  },
  {
    networkId: 1,
    address: '0xc00e94cb662c3520282e6f5717214004a7f26888',
    symbol: 'COMP',
    chainType: ChainType.EVM,
    coingeckoId: 'compound-governance-token',
  },
  {
    networkId: 42220,
    address: '0xe8537a3d056da446677b9e9d6c5db704eaab4787',
    symbol: 'cREAL',
    chainType: ChainType.EVM,
    coingeckoId: 'celo-real-creal',
  },
  {
    networkId: 1,
    address: '0xa0b73e1ff0b80914ab6fe0444e65848c4c34450b',
    symbol: 'CRO',
    chainType: ChainType.EVM,
    coingeckoId: 'crypto-com-chain',
  },
  {
    networkId: 1,
    address: '0x80a7e048f37a50500351c204cb407766fa3bae7f',
    symbol: 'CRPT',
    chainType: ChainType.EVM,
    coingeckoId: 'crypterium',
  },
  {
    networkId: 1,
    address: '0xd533a949740bb3306d119cc777fa900ba034cd52',
    symbol: 'CRV',
    chainType: ChainType.EVM,
    coingeckoId: 'bridged-curve-dao-token-stargate',
  },
  {
    networkId: 100,
    address: '0x1337bedc9d22ecbe766df105c9623922a27963ec',
    symbol: 'CRV',
    chainType: ChainType.EVM,
    coingeckoId: 'bridged-curve-dao-token-stargate',
  },
  {
    networkId: 137,
    address: '0x172370d5cd63279efa6d502dab29171933a610af',
    symbol: 'CRV',
    chainType: ChainType.EVM,
    coingeckoId: 'bridged-curve-dao-token-stargate',
  },
  {
    networkId: 1,
    address: '0x321c2fe4446c7c963dc41dd58879af648838f98d',
    symbol: 'CTX',
    chainType: ChainType.EVM,
    coingeckoId: 'cryptex-finance',
  },
  {
    networkId: 1,
    address: '0xdf801468a808a32656d2ed2d2d80b72a129739f4',
    symbol: 'CUBE',
    chainType: ChainType.EVM,
    coingeckoId: 'somnium-space-cubes',
  },
  {
    networkId: 1,
    address: '0xf0f9d895aca5c8678f706fb8216fa22957685a13',
    symbol: 'CULT',
    chainType: ChainType.EVM,
    coingeckoId: 'cult-dao',
  },
  {
    networkId: 42220,
    address: '0x765de816845861e75a25fca122bb6898b8b1282a',
    symbol: 'cUSD',
    chainType: ChainType.EVM,
    coingeckoId: 'celo-dollar',
  },
  {
    networkId: 1,
    address: '0xbe428c3867f05dea2a89fc76a102b544eac7f772',
    symbol: 'CVT',
    chainType: ChainType.EVM,
    coingeckoId: 'cybervein',
  },
  {
    networkId: 1,
    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
    symbol: 'DAI',
    chainType: ChainType.EVM,
    coingeckoId: 'dai',
  },
  {
    networkId: 1,
    address: '0x0cf0ee63788a0849fe5297f3407f701e122cc023',
    symbol: 'DATA',
    chainType: ChainType.EVM,
    coingeckoId: 'streamr',
  },
  {
    networkId: 1,
    address: '0xc666081073e8dff8d3d1c2292a29ae1a2153ec09',
    symbol: 'DGTX',
    chainType: ChainType.EVM,
    coingeckoId: 'digitex-futures-exchange',
  },
  {
    networkId: 1,
    address: '0xad32a8e6220741182940c5abf610bde99e737b2d',
    symbol: 'DOUGH',
    chainType: ChainType.EVM,
    coingeckoId: 'dough',
  },
  {
    networkId: 1,
    address: '0x419c4db4b9e25d6db2ad9691ccb832c8d9fda05e',
    symbol: 'DRGN',
    chainType: ChainType.EVM,
    coingeckoId: 'dragonchain',
  },
  {
    networkId: 1,
    address: '0x973e52691176d36453868d9d86572788d27041a9',
    symbol: 'DX',
    chainType: ChainType.EVM,
    coingeckoId: 'dxchain',
  },
  {
    networkId: 1,
    address: '0xbf2179859fc6d5bee9bf9158632dc51678a4100e',
    symbol: 'ELF',
    chainType: ChainType.EVM,
    coingeckoId: 'aelf',
  },
  {
    networkId: 1,
    address: '0xf629cbd94d3791c9250152bd8dfbdf380e2a3b9c',
    symbol: 'ENJ',
    chainType: ChainType.EVM,
    coingeckoId: 'enjincoin',
  },
  {
    networkId: 1,
    address: '0xc18360217d8f7ab5e7c516566761ea12ce7f9d72',
    symbol: 'ENS',
    chainType: ChainType.EVM,
    coingeckoId: 'ethereum-name-service',
  },
  {
    networkId: 1,
    address: '0x86fa049857e0209aa7d9e616f7eb3b3b78ecfdb0',
    symbol: 'EOS',
    chainType: ChainType.EVM,
    coingeckoId: 'eos',
  },
  {
    networkId: 1,
    address: '0xdb25f211ab05b1c97d595516f45794528a807ad8',
    symbol: 'EURS',
    chainType: ChainType.EVM,
    coingeckoId: 'stasis-eurs',
  },
  {
    networkId: 1,
    address: '0xaea46a60368a7bd060eec7df8cba43b7ef41ad85',
    symbol: 'FET',
    chainType: ChainType.EVM,
    coingeckoId: 'fetch-ai',
  },
  {
    networkId: 1,
    address: '0xc770eefad204b5180df6a14ee197d99d808ee52d',
    symbol: 'FOX',
    chainType: ChainType.EVM,
    coingeckoId: 'farmers-only',
  },
  {
    networkId: 100,
    address: '0x21a42669643f45bc0e086b8fc2ed70c23d67509d',
    symbol: 'FOX',
    chainType: ChainType.EVM,
    coingeckoId: 'farmers-only',
  },
  {
    networkId: 137,
    address: '0x45c32fa6df82ead1e2ef74d17b76547eddfaff89',
    symbol: 'FRAX',
    chainType: ChainType.EVM,
    coingeckoId: 'frax',
  },
  {
    networkId: 1,
    address: '0x4e15361fd6b4bb609fa63c81a2be19d873717870',
    symbol: 'FTM',
    chainType: ChainType.EVM,
    coingeckoId: 'fantom',
  },
  {
    networkId: 1,
    address: '0x6810e776880c02933d47db1b9fc05908e5386b96',
    symbol: 'GNO',
    chainType: ChainType.EVM,
    coingeckoId: 'gnosis',
  },
  {
    networkId: 1,
    address: '0xa74476443119a942de498590fe1f2454d7d4ac0d',
    symbol: 'GNT',
    chainType: ChainType.EVM,
    coingeckoId: 'genit-chain',
  },
  {
    networkId: 1,
    address: '0xc944e90c64b2c07662a292be6244bdf05cda44a7',
    symbol: 'GRT',
    chainType: ChainType.EVM,
    coingeckoId: 'the-graph',
  },
  {
    networkId: 1,
    address: '0xe66747a101bff2dba3697199dcce5b743b454759',
    symbol: 'GT',
    chainType: ChainType.EVM,
    coingeckoId: 'gatechain-token',
  },
  {
    networkId: 1,
    address: '0xde30da39c46104798bb5aa3fe8b9e0e1f348163f',
    symbol: 'GTC',
    chainType: ChainType.EVM,
    coingeckoId: 'gitcoin',
  },
  {
    networkId: 1,
    address: '0x056fd409e1d7a124bd7017459dfea2f387b6d5cd',
    symbol: 'GUSD',
    chainType: ChainType.EVM,
    coingeckoId: 'gemini-dollar',
  },
  {
    networkId: 100,
    address: '0xb0c5f3100a4d9d9532a4cfd68c55f1ae8da987eb',
    symbol: 'HAUS',
    chainType: ChainType.EVM,
    coingeckoId: 'daohaus',
  },
  {
    networkId: 1,
    address: '0xf1290473e210b2108a85237fbcd7b6eb42cc654f',
    symbol: 'HEDG',
    chainType: ChainType.EVM,
    coingeckoId: 'hedgetrade',
  },
  {
    networkId: 100,
    address: '0x71850b7e9ee3f13ab46d67167341e4bdc905eef9',
    symbol: 'HNY',
    chainType: ChainType.EVM,
    coingeckoId: 'honey',
  },
  {
    networkId: 1,
    address: '0x6c6ee5e31d828de241282b9606c8e98ea48526e2',
    symbol: 'HOT',
    chainType: ChainType.EVM,
    coingeckoId: 'holotoken',
  },
  {
    networkId: 1,
    address: '0xa66daa57432024023db65477ba87d4e7f5f95213',
    symbol: 'HPT',
    chainType: ChainType.EVM,
    coingeckoId: 'huobi-pool-token',
  },
  {
    networkId: 1,
    address: '0x6f259637dcd74c767781e37bc6133cd6a68aa161',
    symbol: 'HT',
    chainType: ChainType.EVM,
    coingeckoId: 'huobi-token',
  },
  {
    networkId: 1,
    address: '0xdf574c24545e5ffecb9a659c229253d4111d87e1',
    symbol: 'HUSD',
    chainType: ChainType.EVM,
    coingeckoId: 'husd',
  },
  {
    networkId: 1,
    address: '0xb705268213d593b8fd88d3fdeff93aff5cbdcfae',
    symbol: 'IDEX',
    chainType: ChainType.EVM,
    coingeckoId: 'aurora-dao',
  },
  {
    networkId: 1,
    address: '0x875773784af8135ea0ef43b5a374aad105c5d39e',
    symbol: 'IDLE',
    chainType: ChainType.EVM,
    coingeckoId: 'idle',
  },
  {
    networkId: 1,
    address: '0xe28b3b32b6c345a34ff64674606124dd5aceca30',
    symbol: 'INJ',
    chainType: ChainType.EVM,
    coingeckoId: 'injective-protocol',
  },
  {
    networkId: 1,
    address: '0x039b5649a59967e3e936d7471f9c3700100ee1ab',
    symbol: 'KCS',
    chainType: ChainType.EVM,
    coingeckoId: 'kucoin-shares',
  },
  {
    networkId: 1,
    address: '0xdd974d5c2e2928dea5f71b9825b8b646686bd200',
    symbol: 'KNC',
    chainType: ChainType.EVM,
    coingeckoId: 'kyber-network-crystal',
  },
  {
    networkId: 137,
    address: '0xc3c7d422809852031b44ab29eec9f1eff2a58756',
    symbol: 'LDO',
    chainType: ChainType.EVM,
    coingeckoId: 'lido-dao',
  },
  {
    networkId: 1,
    address: '0x5a98fcbea516cf06857215779fd812ca3bef1b32',
    symbol: 'LDO',
    chainType: ChainType.EVM,
    coingeckoId: 'lido-dao',
  },
  {
    networkId: 1,
    address: '0x80fb784b7ed66730e8b1dbd9820afd29931aab03',
    symbol: 'LEND',
    chainType: ChainType.EVM,
    coingeckoId: 'ethlend',
  },
  {
    networkId: 1,
    address: '0x2af5d2ad76741191d15dfe7bf6ac92d4bd912ca3',
    symbol: 'LEO',
    chainType: ChainType.EVM,
    coingeckoId: 'leopold',
  },
  {
    networkId: 1,
    address: '0x514910771af9ca656af840dff83e8264ecf986ca',
    symbol: 'LINK',
    chainType: ChainType.EVM,
    coingeckoId: 'chainlink',
  },
  {
    networkId: 100,
    address: '0xe2e73a1c69ecf83f464efce6a5be353a37ca09b2',
    symbol: 'LINK',
    chainType: ChainType.EVM,
    coingeckoId: 'chainlink',
  },
  {
    networkId: 137,
    address: '0x53e0bca35ec356bd5dddfebbd1fc0fd03fabad39',
    symbol: 'LINK',
    chainType: ChainType.EVM,
    coingeckoId: 'chainlink',
  },
  {
    networkId: 1,
    address: '0x58b6a8a3302369daec383334672404ee733ab239',
    symbol: 'LPT',
    chainType: ChainType.EVM,
    coingeckoId: 'livepeer',
  },
  {
    networkId: 1,
    address: '0xbbbbca6a901c926f240b89eacb641d8aec7aeafd',
    symbol: 'LRC',
    chainType: ChainType.EVM,
    coingeckoId: 'loopring',
  },
  {
    networkId: 1,
    address: '0x0f5d2fb29fb7d3cfee444a200298f468908cc942',
    symbol: 'MANA',
    chainType: ChainType.EVM,
    coingeckoId: 'decentraland',
  },
  {
    networkId: 1,
    address: '0x69af81e73a73b40adf4f3d4223cd9b1ece623074',
    symbol: 'MASK',
    chainType: ChainType.EVM,
    coingeckoId: 'mask-network',
  },
  {
    networkId: 1,
    address: '0xb63b606ac810a52cca15e44bb630fd42d8d1d83d',
    symbol: 'MCO',
    chainType: ChainType.EVM,
    coingeckoId: 'monaco',
  },
  {
    networkId: 1,
    address: '0xfc98e825a2264d890f9a1e68ed50e1526abccacd',
    symbol: 'MCO2',
    chainType: ChainType.EVM,
    coingeckoId: 'moss-carbon-credit',
  },
  {
    networkId: 137,
    address: '0xa3fa99a148fa48d14ed51d610c367c61876997f1',
    symbol: 'MIMATIC',
    chainType: ChainType.EVM,
    coingeckoId: 'mai-arbitrum',
  },
  {
    networkId: 1,
    address: '0x09a3ecafa817268f77be1283176b946c4ff2e608',
    symbol: 'MIR',
    chainType: ChainType.EVM,
    coingeckoId: 'mirror-protocol',
  },
  {
    networkId: 1,
    address: '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2',
    symbol: 'MKR',
    chainType: ChainType.EVM,
    coingeckoId: 'maker',
  },
  {
    networkId: 10,
    address: '0x819845b60a192167ed1139040b4f8eca31834f27',
    symbol: 'MPETH',
    chainType: ChainType.EVM,
    coingeckoId: 'mpeth',
  },
  {
    networkId: 1,
    address: '0x48afbbd342f64ef8a9ab1c143719b63c2ad81710',
    symbol: 'MPETH',
    chainType: ChainType.EVM,
    coingeckoId: 'mpeth',
  },
  {
    networkId: 1,
    address: '0x1776e1f26f98b1a5df9cd347953a26dd3cb46671',
    symbol: 'NMR',
    chainType: ChainType.EVM,
    coingeckoId: 'numeraire',
  },
  {
    networkId: 1,
    address: '0xa15c7ebe1f07caf6bff097d8a589fb8ac49ae5b3',
    symbol: 'NPXS',
    chainType: ChainType.EVM,
    coingeckoId: 'pundi-x',
  },
  {
    networkId: 1,
    address: '0x4fe83213d56308330ec302a8bd641f1d0113a4cc',
    symbol: 'NU',
    chainType: ChainType.EVM,
    coingeckoId: 'nucypher',
  },
  {
    networkId: 1,
    address: '0x75231f58b43240c9718dd58b4967c5114342a86c',
    symbol: 'OKB',
    chainType: ChainType.EVM,
    coingeckoId: 'okb',
  },
  {
    networkId: 1,
    address: '0xd26114cd6ee289accf82350c8d8487fedb8a0c07',
    symbol: 'OMG',
    chainType: ChainType.EVM,
    coingeckoId: 'omisego',
  },
  {
    networkId: 1,
    address: '0xff56cc6b1e6ded347aa0b7676c85ab0b3d08b0fa',
    symbol: 'ORBS',
    chainType: ChainType.EVM,
    coingeckoId: 'orbs',
  },
  {
    networkId: 1,
    address: '0x4575f41308ec1483f3d399aa9a2826d74da13deb',
    symbol: 'OXT',
    chainType: ChainType.EVM,
    coingeckoId: 'orchid-protocol',
  },
  {
    networkId: 1,
    address: '0xd56dac73a4d6766464b38ec6d91eb45ce7457c44',
    symbol: 'PAN',
    chainType: ChainType.EVM,
    coingeckoId: 'pantos',
  },
  {
    networkId: 100,
    address: '0x981fb9ba94078a2275a8fc906898ea107b9462a8',
    symbol: 'PAN',
    chainType: ChainType.EVM,
    coingeckoId: 'pantos',
  },
  {
    networkId: 1,
    address: '0x45804880de22913dafe09f4980848ece6ecbaf78',
    symbol: 'PAXG',
    chainType: ChainType.EVM,
    coingeckoId: 'pax-gold',
  },
  {
    networkId: 137,
    address: '0x553d3d295e0f695b9228246232edf400ed3560b5',
    symbol: 'PAXG',
    chainType: ChainType.EVM,
    coingeckoId: 'pax-gold',
  },
  {
    networkId: 1,
    address: '0x595832f8fc6bf59c85c527fec3740a1b7a361269',
    symbol: 'POWR',
    chainType: ChainType.EVM,
    coingeckoId: 'power-ledger',
  },
  {
    networkId: 1,
    address: '0x6c3ea9036406852006290770BEdFcAbA0e23A0e8',
    symbol: 'pyUSD',
    chainType: ChainType.EVM,
    coingeckoId: 'paypal-usd',
  },
  {
    networkId: 1,
    address: '0x4a220e6096b25eadb88358cb44068a3248254675',
    symbol: 'QNT',
    chainType: ChainType.EVM,
    coingeckoId: 'quant-network',
  },
  {
    networkId: 137,
    address: '0xb5c064f955d8e7f38fe0460c556a72987494ee17',
    symbol: 'QUICK',
    chainType: ChainType.EVM,
    coingeckoId: 'quick',
  },
  {
    networkId: 1,
    address: '0x31c8eacbffdd875c74b94b077895bd78cf1e64a3',
    symbol: 'RAD',
    chainType: ChainType.EVM,
    coingeckoId: 'rad',
  },
  {
    networkId: 1,
    address: '0x03ab458634910aad20ef5f1c8ee96f1d6ac54919',
    symbol: 'RAI',
    chainType: ChainType.EVM,
    coingeckoId: 'rai',
  },
  {
    networkId: 1,
    address: '0xba5bde662c17e2adff1075610382b9b691296350',
    symbol: 'RARE',
    chainType: ChainType.EVM,
    coingeckoId: 'superrare',
  },
  {
    networkId: 1,
    address: '0xf970b8e36e23f7fc3fd752eea86f8be8d83375a6',
    symbol: 'RCN',
    chainType: ChainType.EVM,
    coingeckoId: 'ripio-credit-network',
  },
  {
    networkId: 1,
    address: '0x408e41876cccdc0f92210600ef50372656052a38',
    symbol: 'REN',
    chainType: ChainType.EVM,
    coingeckoId: 'republic-protocol',
  },
  {
    networkId: 1,
    address: '0x1985365e9f78359a9b6ad760e32412f4a445e862',
    symbol: 'REP',
    chainType: ChainType.EVM,
    coingeckoId: 'augur',
  },
  {
    networkId: 1,
    address: '0xae78736cd615f374d3085123a210448e74fc6393',
    symbol: 'RETH',
    chainType: ChainType.EVM,
    coingeckoId: 'bridged-rocket-pool-eth-manta-pacific',
  },
  {
    networkId: 10,
    address: '0x9bcef72be871e61ed4fbbc7630889bee758eb81d',
    symbol: 'RETH',
    chainType: ChainType.EVM,
    coingeckoId: 'bridged-rocket-pool-eth-manta-pacific',
  },
  {
    networkId: 1,
    address: '0x607f4c5bb672230e8672085532f7e901544a7375',
    symbol: 'RLC',
    chainType: ChainType.EVM,
    coingeckoId: 'iexec-rlc',
  },
  {
    networkId: 1,
    address: '0xd33526068d116ce69f19a9ee46f0bd304f21a51f',
    symbol: 'RPL',
    chainType: ChainType.EVM,
    coingeckoId: 'rocket-pool',
  },
  {
    networkId: 1,
    address: '0x8762db106b2c2a0bccb3a80d1ed41273552616e8',
    symbol: 'RSR',
    chainType: ChainType.EVM,
    coingeckoId: 'reserve-rights-token',
  },
  {
    networkId: 1,
    address: '0x3845badade8e6dff049820680d1f14bd3903a5d0',
    symbol: 'SAND',
    chainType: ChainType.EVM,
    coingeckoId: 'the-sandbox',
  },
  {
    networkId: 137,
    address: '0xbbba073c31bf03b8acf7c28ef0738decf3695683',
    symbol: 'SAND',
    chainType: ChainType.EVM,
    coingeckoId: 'the-sandbox',
  },
  {
    networkId: 1,
    address: '0x30cf203b48edaa42c3b4918e955fed26cd012a3f',
    symbol: 'SEED',
    chainType: ChainType.EVM,
    coingeckoId: 'bonsai3',
  },
  {
    networkId: 1,
    address: '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce',
    symbol: 'SHIB',
    chainType: ChainType.EVM,
    coingeckoId: 'shiba-inu',
  },
  {
    networkId: 1,
    address: '0xcc8fa225d80b9c7d42f96e9570156c65d6caaa25',
    symbol: 'SLP',
    chainType: ChainType.EVM,
    coingeckoId: 'smooth-love-potion',
  },
  {
    networkId: 1,
    address: '0x744d70fdbe2ba4cf95131626614a1763df805b9e',
    symbol: 'SNT',
    chainType: ChainType.EVM,
    coingeckoId: 'status',
  },
  {
    networkId: 1,
    address: '0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f',
    symbol: 'SNX',
    chainType: ChainType.EVM,
    coingeckoId: 'havven',
  },
  {
    networkId: 1,
    address: '0x446c9033e7516d820cc9a2ce2d0b7328b579406f',
    symbol: 'SOLVE',
    chainType: ChainType.EVM,
    coingeckoId: 'solve-care',
  },
  {
    networkId: 100,
    address: '0xb7d311e2eb55f2f68a9440da38e7989210b9a05e',
    symbol: 'STAKE',
    chainType: ChainType.EVM,
    coingeckoId: 'xdai-stake',
  },
  {
    networkId: 1,
    address: '0xae7ab96520de3a18e5e111b5eaab095312d7fe84',
    symbol: 'STETH',
    chainType: ChainType.EVM,
    coingeckoId: 'staked-ether',
  },
  {
    networkId: 137,
    address: '0x3a58a54c066fdc0f2d55fc9c89f0415c92ebf3c4',
    symbol: 'stMATIC',
    chainType: ChainType.EVM,
    coingeckoId: 'lido-staked-matic',
  },
  {
    networkId: 1,
    address: '0xb64ef51c888972c908cfacf59b47c1afbc0ab8ac',
    symbol: 'STORJ',
    chainType: ChainType.EVM,
    coingeckoId: 'storj',
  },
  {
    networkId: 1,
    address: '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2',
    symbol: 'SUSHI',
    chainType: ChainType.EVM,
    coingeckoId: 'sushi',
  },
  {
    networkId: 1,
    address: '0x8ce9137d39326ad0cd6491fb5cc0cba0e089b6a9',
    symbol: 'SXP',
    chainType: ChainType.EVM,
    coingeckoId: 'swipe',
  },
  {
    networkId: 137,
    address: '0x2e1ad108ff1d8c782fcbbb89aad783ac49586756',
    symbol: 'TUSD',
    chainType: ChainType.EVM,
    coingeckoId: 'true-usd',
  },
  {
    networkId: 1,
    address: '0xdd1ad9a21ce722c151a836373babe42c868ce9a4',
    symbol: 'UBI',
    chainType: ChainType.EVM,
    coingeckoId: 'universal-basic-income',
  },
  {
    networkId: 1,
    address: '0x8400d94a5cb0fa0d041a3788e395285d61c9ee5e',
    symbol: 'UBT',
    chainType: ChainType.EVM,
    coingeckoId: 'unibright',
  },
  {
    networkId: 1,
    address: '0x04fa0d235c4abf4bcf4787af4cf447de572ef828',
    symbol: 'UMA',
    chainType: ChainType.EVM,
    coingeckoId: 'uma',
  },
  {
    networkId: 1,
    address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984',
    symbol: 'UNI',
    chainType: ChainType.EVM,
    coingeckoId: 'uniswap',
  },
  {
    networkId: 137,
    address: '0xb33eaad8d922b1083446dc23f610c2567fb5180f',
    symbol: 'UNI',
    chainType: ChainType.EVM,
    coingeckoId: 'uniswap',
  },
  {
    networkId: 100,
    address: '0xddafbb505ad214d7b80b1f830fccc89b60fb7a83',
    symbol: 'USDC',
    chainType: ChainType.EVM,
    coingeckoId: 'beam-bridged-usdc-beam',
  },
  {
    networkId: 1,
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    symbol: 'USDC',
    chainType: ChainType.EVM,
    coingeckoId: 'beam-bridged-usdc-beam',
  },
  {
    networkId: 1,
    address: '0x4f604735c1cf31399c6e711d5962b2b3e0225ad3',
    symbol: 'USDGLO',
    chainType: ChainType.EVM,
    coingeckoId: 'glo-dollar',
  },
  {
    networkId: 137,
    address: '0x4f604735c1cf31399c6e711d5962b2b3e0225ad3',
    symbol: 'USDGLO',
    chainType: ChainType.EVM,
    coingeckoId: 'glo-dollar',
  },
  {
    networkId: 42220,
    address: '0x4f604735c1cf31399c6e711d5962b2b3e0225ad3',
    symbol: 'USDGLO',
    chainType: ChainType.EVM,
    coingeckoId: 'glo-dollar',
  },
  {
    networkId: 100,
    address: '0x4ecaba5870353805a9f068101a40e0f32ed605c6',
    symbol: 'USDT',
    chainType: ChainType.EVM,
    coingeckoId: 'arbitrum-bridged-usdt-arbitrum',
  },
  {
    networkId: 1,
    address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    symbol: 'USDT',
    chainType: ChainType.EVM,
    coingeckoId: 'tether',
  },
  {
    networkId: 10,
    address: '0x9560e827af36c94d2ac33a39bce1fe78631088db',
    symbol: 'VELO',
    chainType: ChainType.EVM,
    coingeckoId: 'velodrome-finance',
  },
  {
    networkId: 1,
    address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    symbol: 'WBTC',
    chainType: ChainType.EVM,
    coingeckoId: 'wrapped-bitcoin',
  },
  {
    networkId: 100,
    address: '0x8e5bbbb09ed1ebde8674cda39a0c169401db4252',
    symbol: 'WBTC',
    chainType: ChainType.EVM,
    coingeckoId: 'bridged-wrapped-bitcoin-manta-pacific',
  },
  {
    networkId: 137,
    address: '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6',
    symbol: 'WBTC',
    chainType: ChainType.EVM,
    coingeckoId: 'wrapped-bitcoin',
  },
  {
    networkId: 1,
    address: '0xc221b7e65ffc80de234bbb6667abdd46593d34f0',
    symbol: 'wCFG',
    chainType: ChainType.EVM,
    coingeckoId: 'wrapped-centrifuge',
  },
  {
    networkId: 137,
    address: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
    symbol: 'WMATIC',
    chainType: ChainType.EVM,
    coingeckoId: 'wmatic',
  },
  {
    networkId: 100,
    address: '0xe91d153e0b41518a2ce8dd3d7944fa863463a97d',
    symbol: 'WXDAI',
    chainType: ChainType.EVM,
    coingeckoId: 'wrapped-xdai',
  },
  {
    networkId: 100,
    address: '0x38fb649ad3d6ba1113be5f57b927053e97fc5bf7',
    symbol: 'XCOMB',
    chainType: ChainType.EVM,
    coingeckoId: 'xdai-native-comb',
  },
  {
    networkId: 1,
    address: '0xa974c709cfb4566686553a20790685a47aceaa33',
    symbol: 'XIN',
    chainType: ChainType.EVM,
    coingeckoId: 'mixin',
  },
  {
    networkId: 1,
    address: '0x0bc529c00c6401aef6d220be8c6ea1667f6ad93e',
    symbol: 'YFI',
    chainType: ChainType.EVM,
    coingeckoId: 'yearn-finance',
  },
  {
    networkId: 1,
    address: '0x25f8087ead173b73d6e8b84329989a8eea16cf73',
    symbol: 'YGG',
    chainType: ChainType.EVM,
    coingeckoId: 'yield-guild-games',
  },
  {
    networkId: 1,
    address: '0xbd0793332e9fb844a52a205a233ef27a5b34b927',
    symbol: 'ZB',
    chainType: ChainType.EVM,
    coingeckoId: 'zoobit-finance',
  },
  {
    networkId: 1,
    address: '0xe41d2489571d322189246dafa5ebde1f4699f498',
    symbol: 'ZRX',
    chainType: ChainType.EVM,
    coingeckoId: '0x',
  },
];

const stagingTokensData: TokenData[] = [
  {
    networkId: 100,
    address: '0x4f4f9b8d5b4d0dc10506e5551b0513b61fd59e75',
    symbol: 'GIV',
    chainType: ChainType.EVM,
    coingeckoId: 'giveth',
  },
  {
    networkId: 100,
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'XDAI',
    chainType: ChainType.EVM,
    coingeckoId: 'xdai',
  },
  {
    networkId: 100,
    address: '0x6a023ccd1ff6f2045c3309768ead9e68f978f6e1',
    symbol: 'WETH',
    chainType: ChainType.EVM,
    coingeckoId: 'bridged-wrapped-ether-fuse',
  },
  {
    networkId: 137,
    address: '0xd6df932a45c0f255f85145f286ea0b292b21c90b',
    symbol: 'AAVE',
    chainType: ChainType.EVM,
    coingeckoId: 'aave',
  },
  {
    networkId: 137,
    address: '0xe0b52e49357fd4daf2c15e02058dce6bc0057db4',
    symbol: 'agEUR',
    chainType: ChainType.EVM,
    coingeckoId: 'ageur',
  },
  {
    networkId: 100,
    address: '0x3a97704a1b25f08aa230ae53b352e2e72ef52843',
    symbol: 'AGVE',
    chainType: ChainType.EVM,
    coingeckoId: 'agave-token',
  },
  {
    networkId: 137,
    address: '0x101a023270368c0d50bffb62780f4afd4ea79c35',
    symbol: 'ANKR',
    chainType: ChainType.EVM,
    coingeckoId: 'ankr',
  },
  {
    networkId: 137,
    address: 'atom',
    symbol: 'ATOM',
    chainType: ChainType.EVM,
    coingeckoId: 'cosmos',
  },
  {
    networkId: 137,
    address: '0x9a71012b13ca4d3d0cdc72a177df3ef03b0e76a3',
    symbol: 'BAL',
    chainType: ChainType.EVM,
    coingeckoId: 'balancer',
  },
  {
    networkId: 137,
    address: '0xfbdd194376de19a88118e84e279b977f165d01b8',
    symbol: 'BIFI',
    chainType: ChainType.EVM,
    coingeckoId: 'beefy-finance',
  },
  {
    networkId: 100,
    address: '0x83ff60e2f93f8edd0637ef669c69d5fb4f64ca8e',
    symbol: 'BRIGHT',
    chainType: ChainType.EVM,
    coingeckoId: 'bright-token',
  },
  {
    networkId: 44787,
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'CELO',
    chainType: ChainType.EVM,
    coingeckoId: 'celo',
  },
  {
    networkId: 44787,
    address: '0x10c892a6ec43a53e45d0b916b4b7d383b1b78c0f',
    symbol: 'cEUR',
    chainType: ChainType.EVM,
    coingeckoId: 'celo-euro',
  },
  {
    networkId: 44787,
    address: '0xe4d517785d091d3c54818832db6094bcc2744545',
    symbol: 'cREAL',
    chainType: ChainType.EVM,
    coingeckoId: 'celo-real-creal',
  },
  {
    networkId: 100,
    address: '0x1337bedc9d22ecbe766df105c9623922a27963ec',
    symbol: 'CRV',
    chainType: ChainType.EVM,
    coingeckoId: 'bridged-curve-dao-token-stargate',
  },
  {
    networkId: 137,
    address: '0x172370d5cd63279efa6d502dab29171933a610af',
    symbol: 'CRV',
    chainType: ChainType.EVM,
    coingeckoId: 'bridged-curve-dao-token-stargate',
  },
  {
    networkId: 44787,
    address: '0x874069fa1eb16d44d622f2e0ca25eea172369bc1',
    symbol: 'cUSD',
    chainType: ChainType.EVM,
    coingeckoId: 'celo-dollar',
  },
  {
    networkId: 5,
    address: '0xdc31ee1784292379fbb2964b3b9c4124d8f89c60',
    symbol: 'DAI',
    chainType: ChainType.EVM,
    coingeckoId: 'bridged-dai-stablecoin-linea',
  },
  {
    networkId: 137,
    address: '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063',
    symbol: 'DAI',
    chainType: ChainType.EVM,
    coingeckoId: 'bridged-dai-stablecoin-linea',
  },
  {
    networkId: 5,
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    chainType: ChainType.EVM,
    coingeckoId: 'bridged-binance-peg-ethereum-opbnb',
  },
  {
    networkId: 11155420,
    address: '0x0043d7c85c8b96a49a72a92c0b48cdc4720437d7',
    symbol: 'ETHx',
    chainType: ChainType.EVM,
    coingeckoId: 'lsdx-pool',
  },
  {
    networkId: 100,
    address: '0x21a42669643f45bc0e086b8fc2ed70c23d67509d',
    symbol: 'FOX',
    chainType: ChainType.EVM,
    coingeckoId: 'farmers-only',
  },
  {
    networkId: 137,
    address: '0x45c32fa6df82ead1e2ef74d17b76547eddfaff89',
    symbol: 'FRAX',
    chainType: ChainType.EVM,
    coingeckoId: 'frax',
  },
  {
    networkId: 11155420,
    address: '0x2f2c819210191750f2e11f7cfc5664a0eb4fd5e6',
    symbol: 'GIV',
    chainType: ChainType.EVM,
    coingeckoId: 'giveth',
  },
  {
    networkId: 100,
    address: '0xb0c5f3100a4d9d9532a4cfd68c55f1ae8da987eb',
    symbol: 'HAUS',
    chainType: ChainType.EVM,
    coingeckoId: 'daohaus',
  },
  {
    networkId: 100,
    address: '0x71850b7e9ee3f13ab46d67167341e4bdc905eef9',
    symbol: 'HNY',
    chainType: ChainType.EVM,
    coingeckoId: 'honey',
  },
  {
    networkId: 137,
    address: '0xc3c7d422809852031b44ab29eec9f1eff2a58756',
    symbol: 'LDO',
    chainType: ChainType.EVM,
    coingeckoId: 'lido-dao',
  },
  {
    networkId: 100,
    address: '0xe2e73a1c69ecf83f464efce6a5be353a37ca09b2',
    symbol: 'LINK',
    chainType: ChainType.EVM,
    coingeckoId: 'chainlink',
  },
  {
    networkId: 137,
    address: '0x53e0bca35ec356bd5dddfebbd1fc0fd03fabad39',
    symbol: 'LINK',
    chainType: ChainType.EVM,
    coingeckoId: 'chainlink',
  },
  {
    networkId: 137,
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'MATIC',
    chainType: ChainType.EVM,
    coingeckoId: 'matic-network',
  },
  {
    networkId: 137,
    address: '0xa3fa99a148fa48d14ed51d610c367c61876997f1',
    symbol: 'MIMATIC',
    chainType: ChainType.EVM,
    coingeckoId: 'mai-arbitrum',
  },
  {
    networkId: 10,
    address: '0x819845b60a192167ed1139040b4f8eca31834f27',
    symbol: 'mpETH',
    chainType: ChainType.EVM,
    coingeckoId: 'mpeth',
  },
  {
    networkId: 100,
    address: '0x981fb9ba94078a2275a8fc906898ea107b9462a8',
    symbol: 'PAN',
    chainType: ChainType.EVM,
    coingeckoId: 'pantos',
  },
  {
    networkId: 137,
    address: '0x553d3d295e0f695b9228246232edf400ed3560b5',
    symbol: 'PAXG',
    chainType: ChainType.EVM,
    coingeckoId: 'pax-gold',
  },
  {
    networkId: 137,
    address: '0xb5c064f955d8e7f38fe0460c556a72987494ee17',
    symbol: 'QUICK',
    chainType: ChainType.EVM,
    coingeckoId: 'quick',
  },
  {
    networkId: 137,
    address: '0xbbba073c31bf03b8acf7c28ef0738decf3695683',
    symbol: 'SAND',
    chainType: ChainType.EVM,
    coingeckoId: 'the-sandbox',
  },
  {
    networkId: 100,
    address: '0xb7d311e2eb55f2f68a9440da38e7989210b9a05e',
    symbol: 'STAKE',
    chainType: ChainType.EVM,
    coingeckoId: 'xdai-stake',
  },
  {
    networkId: 137,
    address: '0x3a58a54c066fdc0f2d55fc9c89f0415c92ebf3c4',
    symbol: 'stMATIC',
    chainType: ChainType.EVM,
    coingeckoId: 'lido-staked-matic',
  },
  {
    networkId: 137,
    address: '0x2e1ad108ff1d8c782fcbbb89aad783ac49586756',
    symbol: 'TUSD',
    chainType: ChainType.EVM,
    coingeckoId: 'true-usd',
  },
  {
    networkId: 137,
    address: '0xb33eaad8d922b1083446dc23f610c2567fb5180f',
    symbol: 'UNI',
    chainType: ChainType.EVM,
    coingeckoId: 'uniswap',
  },
  {
    networkId: 100,
    address: '0xddafbb505ad214d7b80b1f830fccc89b60fb7a83',
    symbol: 'USDC',
    chainType: ChainType.EVM,
    coingeckoId: 'beam-bridged-usdc-beam',
  },
  {
    networkId: 137,
    address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
    symbol: 'USDC',
    chainType: ChainType.EVM,
    coingeckoId: 'beam-bridged-usdc-beam',
  },
  {
    networkId: 137,
    address: '0x4f604735c1cf31399c6e711d5962b2b3e0225ad3',
    symbol: 'USDGLO',
    chainType: ChainType.EVM,
    coingeckoId: 'glo-dollar',
  },
  {
    networkId: 100,
    address: '0x4ecaba5870353805a9f068101a40e0f32ed605c6',
    symbol: 'USDT',
    chainType: ChainType.EVM,
    coingeckoId: 'arbitrum-bridged-usdt-arbitrum',
  },
  {
    networkId: 137,
    address: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
    symbol: 'USDT',
    chainType: ChainType.EVM,
    coingeckoId: 'arbitrum-bridged-usdt-arbitrum',
  },
  {
    networkId: 100,
    address: '0x8e5bbbb09ed1ebde8674cda39a0c169401db4252',
    symbol: 'WBTC',
    chainType: ChainType.EVM,
    coingeckoId: 'bridged-wrapped-bitcoin-manta-pacific',
  },
  {
    networkId: 137,
    address: '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6',
    symbol: 'WBTC',
    chainType: ChainType.EVM,
    coingeckoId: 'wrapped-bitcoin',
  },
  {
    networkId: 61,
    address: '0x82a618305706b14e7bcf2592d4b9324a366b6dad',
    symbol: 'WETC',
    chainType: ChainType.EVM,
    coingeckoId: 'wetc-hebeswap',
  },
  {
    networkId: 137,
    address: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
    symbol: 'WETH',
    chainType: ChainType.EVM,
    coingeckoId: 'bridged-wrapped-ether-fuse',
  },
  {
    networkId: 137,
    address: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270',
    symbol: 'WMATIC',
    chainType: ChainType.EVM,
    coingeckoId: 'wmatic',
  },
  {
    networkId: 100,
    address: '0xe91d153e0b41518a2ce8dd3d7944fa863463a97d',
    symbol: 'WXDAI',
    chainType: ChainType.EVM,
    coingeckoId: 'wrapped-xdai',
  },
  {
    networkId: 100,
    address: '0x38fb649ad3d6ba1113be5f57b927053e97fc5bf7',
    symbol: 'XCOMB',
    chainType: ChainType.EVM,
    coingeckoId: 'xdai-native-comb',
  },
];

export class AddCoingeckoId1709204568033 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const environment = config.get('ENVIRONMENT') as string;
    const tokenData =
      environment === 'production' ? productionTokensData : stagingTokensData;

    const repository = queryRunner.manager.getRepository(Token);
    await Promise.all(
      tokenData.map(async ({ address, networkId, chainType, coingeckoId }) => {
        const token = await repository.findOneBy({
          address:
            chainType === ChainType.EVM ? address.toLocaleLowerCase() : address,
          networkId,
          chainType,
        });

        if (token) {
          token.coingeckoId = coingeckoId;
          await repository.save(token);
        }
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    //
  }
}
