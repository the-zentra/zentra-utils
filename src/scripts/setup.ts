import {
  BackstopClient,
  EmitterClient,
  Network,
  PoolFactoryClient,
  PoolInitMeta,
  TxOptions,
} from '@blend-capital/blend-sdk';
import { Asset } from 'stellar-sdk';
import { tryDeployStellarAsset } from '../external/token.js';
import { AddressBook } from '../utils/address_book.js';
import {
  airdropAccount,
  bumpContractCode,
  bumpContractInstance,
  deployContract,
  installContract,
} from '../utils/contract.js';
import { config } from '../utils/env_config.js';
import { logInvocation, signWithKeypair } from '../utils/tx.js';

export async function deployAndInitContracts(addressBook: AddressBook) {
  const signWithAdmin = (txXdr: string) =>
    signWithKeypair(txXdr, rpc_network.passphrase, config.admin);
  await airdropAccount(config.admin);

  console.log('Installing Blend Contracts');
  await installContract('stream', addressBook, config.admin);
  await bumpContractCode('stream', addressBook, config.admin);
  await installContract('token', addressBook, config.admin);
  await bumpContractCode('token', addressBook, config.admin);

  if (network != 'mainnet') {
    // Tokens
    console.log('Installing and deploying: Tokens');
    await tryDeployStellarAsset(addressBook, config.admin, Asset.native());
    await bumpContractInstance('XLM', addressBook, config.admin);
    await tryDeployStellarAsset(
      addressBook,
      config.admin,
      new Asset('USDC', config.admin.publicKey())
    );
    await bumpContractInstance('USDC', addressBook, config.admin);
    await tryDeployStellarAsset(
      addressBook,
      config.admin,
      new Asset('wETH', config.admin.publicKey())
    );
    await bumpContractInstance('wETH', addressBook, config.admin);
    await tryDeployStellarAsset(
      addressBook,
      config.admin,
      new Asset('wBTC', config.admin.publicKey())
    );
    await bumpContractInstance('wBTC', addressBook, config.admin);
  }

  console.log('Deploying and Initializing Zentra');
  await deployContract('stream', 'stream', addressBook, config.admin);
  await bumpContractInstance('stream', addressBook, config.admin);
  const stream = new StreamContract(addressBook.getContractId('stream'));

  await logInvocation(
    stream.initialize(config.admin.publicKey(), signWithAdmin, rpc_network, tx_options, {
      blnd_token: addressBook.getContractId('BLND'),
      backstop: addressBook.getContractId('backstop'),
      backstop_token: addressBook.getContractId('comet'),
    })
  );

  await bumpContractInstance('stream', addressBook, config.admin);
}

const network = process.argv[2];
const addressBook = AddressBook.loadFromFile(network);

const rpc_network: Network = {
  rpc: config.rpc.serverURL.toString(),
  passphrase: config.passphrase,
  opts: { allowHttp: true },
};
const tx_options: TxOptions = {
  sim: false,
  pollingInterval: 2000,
  timeout: 30000,
  builderOptions: {
    fee: '10000',
    timebounds: {
      minTime: 0,
      maxTime: 0,
    },
    networkPassphrase: config.passphrase,
  },
};
await deployAndInitContracts(addressBook);
addressBook.writeToFile();
