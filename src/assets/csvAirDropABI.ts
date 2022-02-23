export const csvAirDropABI = [
  {
    constant: false,
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'recipients', type: 'address[]' },
      {
        name: 'values',
        type: 'uint256[]',
      },
    ],
    name: 'disperseTokenSimple',
    outputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'data', type: 'bytes' },
      // {
      //   name: 'data',
      //   type: 'tuple[]',
      //   components: [
      //     {
      //       name: 'token',
      //       type: 'uint256'
      //     }, {
      //       name: 'to',
      //       type: 'address'
      //     }, {
      //       name: 'value',
      //       type: 'uint256'
      //     }
      //   ]
      // },
      { name: 'operation', type: 'uint8' },
      { name: 'safeTxGas', type: 'uint256' },
      { name: 'baseGas', type: 'uint256' },
      { name: 'gasPrice', type: 'uint256' },
      { name: 'gasToken', type: 'address' },
      { name: 'refundReceiver', type: 'address' },
      { name: 'signatures', type: 'bytes' },
    ],
    name: 'execTransaction',
    outputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
];
