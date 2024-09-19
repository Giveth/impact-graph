// customQfRoundMultiUpdateComponent.js
import React, { useState } from 'react';
import { Box, Button, Text, DatePicker, Select } from '@adminjs/design-system';
import { FormGroup, Label, Input } from '@adminjs/design-system';
import { ApiClient } from 'adminjs';

const RecordInput = ({ index, record, updateRecord, removeRecord }) => (
  <Box mb="lg" variant="white">
    <FormGroup>
      <Label>Project ID</Label>
      <Input
        value={record.projectId}
        onChange={e => updateRecord(index, 'projectId', e.target.value)}
        required
      />
    </FormGroup>
    <FormGroup>
      <Label>QF Round ID</Label>
      <Input
        value={record.qfRoundId}
        onChange={e => updateRecord(index, 'qfRoundId', e.target.value)}
        required
      />
    </FormGroup>
    <FormGroup>
      <Label>Matching Fund Display Value</Label>
      <Input
        value={record.matchingFund}
        onChange={e => updateRecord(index, 'matchingFund', e.target.value)}
        required
      />
    </FormGroup>
    <FormGroup>
      <Label>Matching Fund Amount</Label>
      <Input
        value={record.matchingFundAmount}
        onChange={e =>
          updateRecord(index, 'matchingFundAmount', e.target.value)
        }
        required
      />
    </FormGroup>
    <FormGroup>
      <Label>Matching Fund Price USD</Label>
      <Input
        value={record.matchingFundPriceUsd}
        onChange={e =>
          updateRecord(index, 'matchingFundPriceUsd', e.target.value)
        }
        required
      />
    </FormGroup>
    <FormGroup>
      <Label>Matching Fund Currency</Label>
      <Input
        value={record.matchingFundCurrency}
        onChange={selected =>
          updateRecord(index, 'matchingFundCurrency', selected.value)
        }
      />
    </FormGroup>
    <FormGroup>
      <Label>Distributed Fund Tx Hash</Label>
      <Input
        value={record.distributedFundTxHash}
        onChange={e =>
          updateRecord(index, 'distributedFundTxHash', e.target.value)
        }
      />
    </FormGroup>
    <FormGroup>
      <Label>Distributed Fund Network</Label>
      <Input
        value={record.distributedFundNetwork}
        onChange={e =>
          updateRecord(index, 'distributedFundNetwork', e.target.value)
        }
      />
    </FormGroup>
    <FormGroup>
      <Label>Distributed Fund Tx Date</Label>
      <DatePicker
        value={record.distributedFundTxDate}
        onChange={date => updateRecord(index, 'distributedFundTxDate', date)}
      />
    </FormGroup>
    <Button onClick={() => removeRecord(index)} mt="default">
      Remove
    </Button>
  </Box>
);

const CustomQfRoundMultiUpdateComponent = props => {
  const [records, setRecords] = useState([
    {
      projectId: '',
      qfRoundId: '',
      matchingFund: '',
      matchingFundAmount: '',
      matchingFundPriceUsd: '',
      matchingFundCurrency: '',
      distributedFundTxHash: '',
      distributedFundNetwork: '',
      distributedFundTxDate: null,
    },
  ]);
  const [message, setMessage] = useState('');

  const api = new ApiClient();

  const addRecord = () => {
    setRecords([
      ...records,
      {
        projectId: '',
        qfRoundId: '',
        matchingFund: '',
        matchingFundAmount: '',
        matchingFundPriceUsd: '',
        matchingFundCurrency: '',
        distributedFundTxHash: '',
        distributedFundNetwork: '',
        distributedFundTxDate: null,
      },
    ]);
  };

  const updateRecord = (index, field, value) => {
    const updatedRecords = [...records];
    updatedRecords[index][field] = value;
    setRecords(updatedRecords);
  };

  const removeRecord = index => {
    const updatedRecords = records.filter((_, i) => i !== index);
    setRecords(updatedRecords);
  };

  const handleSubmit = async event => {
    event.preventDefault();
    setMessage('');

    try {
      const response = await api.resourceAction({
        resourceId: 'QfRoundHistory',
        actionName: 'bulkUpdateQfRound',
        data: { records },
      });

      if (response.data.notice) {
        if (typeof response.data.notice === 'string') {
          setMessage(response.data.notice);
        } else if (typeof response.data.notice.message === 'string') {
          setMessage(response.data.notice.message);
        } else {
          setMessage('Update successful');
        }
      } else {
        setMessage('Update successful');
      }
    } catch (error) {
      setMessage(`Error: ${error.message}`);
    }
  };

  return (
    <Box as="form" onSubmit={handleSubmit}>
      <Text variant="lg" fontWeight="bold">
        Update Multiple QfRoundHistory Records
      </Text>
      {records.map((record, index) => (
        <RecordInput
          key={index}
          index={index}
          record={record}
          updateRecord={updateRecord}
          removeRecord={removeRecord}
        />
      ))}
      <Button onClick={addRecord} mt="default">
        Add Another Record
      </Button>
      <Button type="submit" mt="xl">
        Update All
      </Button>
      {message && <Text mt="default">{message}</Text>}
    </Box>
  );
};

export default CustomQfRoundMultiUpdateComponent;
