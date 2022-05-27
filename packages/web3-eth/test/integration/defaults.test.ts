/*
This file is part of web3.js.

web3.js is free software: you can redistribute it and/or modify
it under the terms of the GNU Lesser General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

web3.js is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License
along with web3.js.  If not, see <http://www.gnu.org/licenses/>.
*/
import WebSocketProvider from 'web3-providers-ws';
// eslint-disable-next-line import/no-extraneous-dependencies
import { Contract } from 'web3-eth-contract';
import { hexToNumber, numberToHex } from 'web3-utils';
import { TransactionBuilder, TransactionTypeParser, Web3Context } from 'web3-core';
import { DEFAULT_RETURN_FORMAT } from 'web3-common';
import { prepareTransactionForSigning, transactionBuilder, Web3Eth } from '../../src';

import { createNewAccount, getSystemTestProvider } from '../fixtures/system_test_utils';
import {
	defaultTransactionBuilder,
	getTransactionFromAttr,
	getTransactionType,
} from '../../src/utils';
import { BasicAbi, BasicBytecode } from '../shared_fixtures/build/Basic';
import { detectTransactionType } from '../../dist';
import { getTransactionGasPricing } from '../../src/utils/get_transaction_gas_pricing';

describe('defaults', () => {
	let web3Eth: Web3Eth;
	let accounts: string[] = [];
	let clientUrl: string;
	let contract: Contract<typeof BasicAbi>;
	let deployOptions: Record<string, unknown>;
	let sendOptions: Record<string, unknown>;

	beforeAll(async () => {
		clientUrl = getSystemTestProvider();
		const acc1 = await createNewAccount({ unlock: true, refill: true });
		const acc2 = await createNewAccount({ unlock: true, refill: true });
		accounts = [acc1.address, acc2.address];
		web3Eth = new Web3Eth(clientUrl);

		contract = new Contract(BasicAbi, undefined, undefined, web3Eth.getContextObject() as any);

		deployOptions = {
			data: BasicBytecode,
			arguments: [10, 'string init value'],
		};

		sendOptions = { from: accounts[0], gas: '1000000' };

		contract = await contract.deploy(deployOptions).send(sendOptions);
	});
	afterAll(() => {
		if (clientUrl.startsWith('ws')) {
			(web3Eth.provider as WebSocketProvider).disconnect();
		}
	});

	describe('defaults', () => {
		it('defaultAccount', () => {
			// default
			expect(web3Eth.defaultAccount).toBeNull();

			// after set
			web3Eth.setConfig({
				defaultAccount: accounts[0],
			});
			expect(web3Eth.defaultAccount).toBe(accounts[0]);

			// set by create new instance
			const eth2 = new Web3Eth({
				provider: clientUrl,
				config: {
					defaultAccount: accounts[1],
				},
			});
			expect(eth2.defaultAccount).toBe(accounts[1]);

			// check utils
			expect(getTransactionFromAttr(eth2)).toBe(accounts[1]);
		});
		it('handleRevert', () => {
			// default
			expect(web3Eth.handleRevert).toBe(false);

			// after set
			web3Eth.setConfig({
				handleRevert: true,
			});
			expect(web3Eth.handleRevert).toBe(true);

			// set by create new instance
			const eth2 = new Web3Eth({
				provider: clientUrl,
				config: {
					handleRevert: true,
				},
			});
			expect(eth2.handleRevert).toBe(true);
		});
		it('defaultBlock', async () => {
			// default
			expect(web3Eth.defaultBlock).toBe('latest');

			// after set
			web3Eth.setConfig({
				defaultBlock: 'earliest',
			});
			expect(web3Eth.defaultBlock).toBe('earliest');

			// set by create new instance
			const eth2 = new Web3Eth({
				provider: clientUrl,
				config: {
					defaultBlock: 'earliest',
				},
			});
			expect(eth2.defaultBlock).toBe('earliest');
			const acc = await createNewAccount({ refill: true });
			// check implementation
			const balance = await eth2.getBalance(acc.address);
			expect(balance).toBe('0x0');
			eth2.setConfig({
				defaultBlock: 'latest',
			});
			const balanceLatest = await eth2.getBalance(acc.address);
			expect(Number(hexToNumber(balanceLatest))).toBeGreaterThan(0);
		});
		it('transactionBlockTimeout', () => {
			// default
			expect(web3Eth.transactionBlockTimeout).toBe(50);

			// after set
			web3Eth.setConfig({
				transactionBlockTimeout: 1,
			});
			expect(web3Eth.transactionBlockTimeout).toBe(1);

			// set by create new instance
			const eth2 = new Web3Eth({
				provider: clientUrl,
				config: {
					transactionBlockTimeout: 120,
				},
			});
			expect(eth2.transactionBlockTimeout).toBe(120);
		});
		it('transactionConfirmationBlocks', () => {
			// default
			expect(web3Eth.transactionConfirmationBlocks).toBe(24);

			// after set
			web3Eth.setConfig({
				transactionConfirmationBlocks: 3,
			});
			expect(web3Eth.transactionConfirmationBlocks).toBe(3);

			// set by create new instance
			const eth2 = new Web3Eth({
				provider: clientUrl,
				config: {
					transactionConfirmationBlocks: 4,
				},
			});
			expect(eth2.transactionConfirmationBlocks).toBe(4);
			// implementation tested here ./watch_transaction.test.ts
		});
		it('transactionPollingInterval and transactionPollingTimeout', () => {
			// default
			expect(web3Eth.transactionPollingInterval).toBe(1000);
			expect(web3Eth.transactionPollingTimeout).toBe(750);

			// after set
			web3Eth.setConfig({
				transactionPollingInterval: 3,
				transactionPollingTimeout: 10,
			});
			expect(web3Eth.transactionPollingInterval).toBe(3);
			expect(web3Eth.transactionPollingTimeout).toBe(10);

			// set by create new instance
			const eth2 = new Web3Eth({
				provider: clientUrl,
				config: {
					transactionPollingInterval: 400,
					transactionPollingTimeout: 10,
				},
			});
			expect(eth2.transactionPollingInterval).toBe(400);
			expect(eth2.transactionPollingTimeout).toBe(10);
		});
		it('transactionReceiptPollingInterval and transactionConfirmationPollingInterval', () => {
			// default
			expect(web3Eth.transactionReceiptPollingInterval).toBeNull();
			expect(web3Eth.transactionConfirmationPollingInterval).toBeNull();

			// after set
			web3Eth.setConfig({
				transactionReceiptPollingInterval: 3,
				transactionConfirmationPollingInterval: 10,
			});
			expect(web3Eth.transactionReceiptPollingInterval).toBe(3);
			expect(web3Eth.transactionConfirmationPollingInterval).toBe(10);

			// set by create new instance
			const eth2 = new Web3Eth({
				provider: clientUrl,
				config: {
					transactionReceiptPollingInterval: 400,
					transactionConfirmationPollingInterval: 10,
				},
			});
			expect(eth2.transactionReceiptPollingInterval).toBe(400);
			expect(eth2.transactionConfirmationPollingInterval).toBe(10);
		});
		it('blockHeaderTimeout', () => {
			// default
			expect(web3Eth.blockHeaderTimeout).toBe(10);

			// after set
			web3Eth.setConfig({
				blockHeaderTimeout: 3,
			});
			expect(web3Eth.blockHeaderTimeout).toBe(3);

			// set by create new instance
			const eth2 = new Web3Eth({
				provider: clientUrl,
				config: {
					blockHeaderTimeout: 4,
				},
			});
			expect(eth2.blockHeaderTimeout).toBe(4);
		});
		it('maxListenersWarningThreshold', () => {
			// default
			expect(web3Eth.maxListenersWarningThreshold).toBe(100);

			// after set
			web3Eth.setConfig({
				maxListenersWarningThreshold: 3,
			});
			expect(web3Eth.maxListenersWarningThreshold).toBe(3);

			// set by create new instance
			const eth2 = new Web3Eth({
				provider: clientUrl,
				config: {
					maxListenersWarningThreshold: 4,
				},
			});
			expect(eth2.maxListenersWarningThreshold).toBe(4);
		});
		it('defaultNetworkId', async () => {
			// default
			expect(web3Eth.defaultNetworkId).toBeNull();

			// after set
			web3Eth.setConfig({
				defaultNetworkId: 3,
			});
			expect(web3Eth.defaultNetworkId).toBe(3);

			// set by create new instance
			const eth2 = new Web3Eth({
				provider: clientUrl,
				config: {
					defaultNetworkId: 4,
				},
			});
			expect(eth2.defaultNetworkId).toBe(4);
			const res = await defaultTransactionBuilder({
				transaction: {
					from: '0xEB014f8c8B418Db6b45774c326A0E64C78914dC0',
					to: '0x3535353535353535353535353535353535353535',
					value: '0x174876e800',
					gas: '0x5208',
				},
				web3Context: eth2 as Web3Context<any>,
			});
			expect(res.networkId).toBe(4);
		});
		it('defaultChain', async () => {
			// default
			expect(web3Eth.defaultChain).toBe('mainnet');

			// after set
			web3Eth.setConfig({
				defaultChain: 'ropsten',
			});
			expect(web3Eth.defaultChain).toBe('ropsten');

			// set by create new instance
			const eth2 = new Web3Eth({
				provider: clientUrl,
				config: {
					defaultChain: 'rinkeby',
				},
			});
			expect(eth2.defaultChain).toBe('rinkeby');
			const res = await defaultTransactionBuilder({
				transaction: {
					from: '0xEB014f8c8B418Db6b45774c326A0E64C78914dC0',
					to: '0x3535353535353535353535353535353535353535',
					value: '0x174876e800',
					gas: '0x5208',
				},
				web3Context: eth2 as Web3Context<any>,
			});
			expect(res.chain).toBe('rinkeby');
		});
		it('defaultHardfork', async () => {
			// default
			expect(web3Eth.defaultHardfork).toBe('london');

			// after set
			web3Eth.setConfig({
				defaultHardfork: 'dao',
			});
			expect(web3Eth.defaultHardfork).toBe('dao');

			// set by create new instance
			const eth2 = new Web3Eth({
				provider: clientUrl,
				config: {
					defaultHardfork: 'istanbul',
				},
			});
			expect(eth2.defaultHardfork).toBe('istanbul');

			const res = await prepareTransactionForSigning(
				{
					from: '0xEB014f8c8B418Db6b45774c326A0E64C78914dC0',
					to: '0x3535353535353535353535353535353535353535',
					value: '0x174876e800',
					gas: '0x5208',
					gasPrice: '0x4a817c800',
					data: '0x0',
					nonce: '0x4',
					chainId: '0x1',
					gasLimit: '0x5208',
				},
				eth2,
			);
			expect(res.common.hardfork()).toBe('istanbul');
		});
		it('defaultCommon', () => {
			// default
			expect(web3Eth.defaultCommon).toBeNull();
			const common = {
				customChain: {
					name: 'test',
					networkId: 123,
					chainId: 1234,
				},
				baseChain: 12345,
				hardfork: 'dao',
			};
			// after set
			web3Eth.setConfig({
				defaultCommon: common,
			});
			expect(web3Eth.defaultCommon).toBe(common);

			// set by create new instance
			const eth2 = new Web3Eth({
				provider: clientUrl,
				config: {
					defaultCommon: common,
				},
			});
			expect(eth2.defaultCommon).toBe(common);
		});
		it('defaultTransactionType', () => {
			// default
			expect(web3Eth.defaultTransactionType).toBe('0x0');
			// after set
			web3Eth.setConfig({
				defaultTransactionType: '0x3',
			});
			expect(web3Eth.defaultTransactionType).toBe('0x3');

			// set by create new instance
			const eth2 = new Web3Eth({
				provider: clientUrl,
				config: {
					defaultTransactionType: '0x4444',
				},
			});
			expect(eth2.defaultTransactionType).toBe('0x4444');

			const res = getTransactionType(
				{
					from: '0xEB014f8c8B418Db6b45774c326A0E64C78914dC0',
					to: '0x3535353535353535353535353535353535353535',
					value: '0x174876e800',
					gas: '0x5208',
					data: '0x0',
					nonce: '0x4',
					chainId: '0x1',
					gasLimit: '0x5208',
				},
				eth2,
			);
			expect(res).toBe('0x4444');
		});
		it('defaultMaxPriorityFeePerGas', async () => {
			// default
			expect(web3Eth.defaultMaxPriorityFeePerGas).toBe(numberToHex(2500000000));
			// after set
			web3Eth.setConfig({
				defaultMaxPriorityFeePerGas: numberToHex(2100000000),
			});
			expect(web3Eth.defaultMaxPriorityFeePerGas).toBe(numberToHex(2100000000));

			// set by create new instance
			const eth2 = new Web3Eth({
				provider: clientUrl,
				config: {
					defaultMaxPriorityFeePerGas: numberToHex(1200000000),
				},
			});
			expect(eth2.defaultMaxPriorityFeePerGas).toBe(numberToHex(1200000000));

			const res = await getTransactionGasPricing(
				{
					from: '0xEB014f8c8B418Db6b45774c326A0E64C78914dC0',
					to: '0x3535353535353535353535353535353535353535',
					value: '0x174876e800',
					type: '0x2',
					gas: '0x5208',
					data: '0x0',
					nonce: '0x4',
					chainId: '0x1',
					gasLimit: '0x5208',
				},
				eth2,
				DEFAULT_RETURN_FORMAT,
			);
			expect(res?.maxPriorityFeePerGas).toBe(numberToHex(1200000000));
		});
		it('transactionBuilder', async () => {
			// default
			expect(web3Eth.transactionBuilder).toBeUndefined();

			// default
			expect(web3Eth.transactionBuilder).toBeUndefined();

			const newBuilderMock = jest.fn() as unknown as TransactionBuilder;

			web3Eth.setConfig({
				transactionBuilder: newBuilderMock,
			});
			expect(web3Eth.transactionBuilder).toBe(newBuilderMock);

			// set by create new instance
			const eth2 = new Web3Eth({
				provider: clientUrl,
				config: {
					transactionBuilder: newBuilderMock,
				},
			});
			expect(eth2.transactionBuilder).toBe(newBuilderMock);

			await transactionBuilder({
				transaction: {
					from: '0xEB014f8c8B418Db6b45774c326A0E64C78914dC0',
					to: '0x3535353535353535353535353535353535353535',
					value: '0x174876e800',
					gas: '0x5208',
					gasPrice: '0x4a817c800',
					data: '0x0',
					nonce: '0x4',
					chainId: '0x1',
					gasLimit: '0x5208',
				},
				web3Context: eth2,
			});
			expect(newBuilderMock).toHaveBeenCalled();
		});
		it('transactionTypeParser', () => {
			// default
			expect(web3Eth.transactionTypeParser).toBeUndefined();

			const newParserMock = jest.fn() as unknown as TransactionTypeParser;

			web3Eth.setConfig({
				transactionTypeParser: newParserMock,
			});
			expect(web3Eth.transactionTypeParser).toBe(newParserMock);

			// set by create new instance
			const eth2 = new Web3Eth({
				provider: clientUrl,
				config: {
					transactionTypeParser: newParserMock,
				},
			});
			expect(eth2.transactionTypeParser).toBe(newParserMock);
			detectTransactionType(
				{
					from: '0xEB014f8c8B418Db6b45774c326A0E64C78914dC0',
					to: '0x3535353535353535353535353535353535353535',
					value: '0x174876e800',
					gas: '0x5208',
					gasPrice: '0x4a817c800',
					data: '0x0',
					nonce: '0x4',
					chainId: '0x1',
					gasLimit: '0x5208',
				},
				eth2,
			);
			expect(newParserMock).toHaveBeenCalled();
		});
	});
});
