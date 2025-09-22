import React, { useState, useEffect } from 'react';
import { withTheme } from 'styled-components';
import {
  Box,
  Button,
  Text,
  FormGroup,
  Label,
  Input,
} from '@adminjs/design-system';
import { ApiClient } from 'adminjs';

const GlobalConfigComponent = () => {
  const [minimumPassportScore, setMinimumPassportScore] = useState<string>('');
  const [minimumMBDScore, setMinimumMBDScore] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Load current values on component mount
  useEffect(() => {
    loadCurrentValues();
  }, []);

  const loadCurrentValues = async () => {
    try {
      setLoading(true);
      const api = new ApiClient();

      // Query the global configuration values using AdminJS API
      const response = await api.resourceAction({
        resourceId: 'GlobalConfiguration',
        actionName: 'list',
        params: {
          filters: {
            key: 'GLOBAL_MINIMUM_PASSPORT_SCORE,GLOBAL_MINIMUM_MBD_SCORE',
          },
        },
      });

      if (response.data && response.data.records) {
        const passportConfig = response.data.records.find(
          (record: any) =>
            record.params.key === 'GLOBAL_MINIMUM_PASSPORT_SCORE',
        );
        const mbdConfig = response.data.records.find(
          (record: any) => record.params.key === 'GLOBAL_MINIMUM_MBD_SCORE',
        );

        setMinimumPassportScore(passportConfig?.params.value || '');
        setMinimumMBDScore(mbdConfig?.params.value || '');
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error loading current values:', err);
      setError('Failed to load current values');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setMessage('');
      setError('');

      const api = new ApiClient();

      // Call the custom AdminJS action to update global configs
      const response = await api.resourceAction({
        resourceId: 'GlobalConfiguration',
        actionName: 'updateGlobalConfigs',
        data: {
          minimumPassportScore: minimumPassportScore
            ? parseFloat(minimumPassportScore)
            : null,
          minimumMBDScore: minimumMBDScore ? parseFloat(minimumMBDScore) : null,
        },
      });

      if (response.data && response.data.notice) {
        const notice = response.data.notice;
        if (notice.type === 'success') {
          setMessage(notice.message);
        } else {
          setError(notice.message);
        }
      } else {
        setError('Failed to save configuration. Please try again.');
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error saving configuration:', err);
      setError('Failed to save configuration. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePassportScoreChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = e.target.value;
    // Allow only numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setMinimumPassportScore(value);
    }
  };

  const handleMBDScoreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setMinimumMBDScore(value);
    }
  };

  return (
    <Box variant="white" p="xl">
      <Text variant="lg" fontWeight="bold" mb="lg">
        Global Configuration Settings
      </Text>

      <Box mb="lg">
        <FormGroup>
          <Label htmlFor="passport-score">Minimum Passport Score</Label>
          <Input
            id="passport-score"
            type="number"
            step="0.1"
            min="0"
            max="1"
            value={minimumPassportScore}
            onChange={handlePassportScoreChange}
            placeholder="Enter minimum passport score (0.0 - 1.0)"
            disabled={loading}
          />
        </FormGroup>
      </Box>

      <Box mb="lg">
        <FormGroup>
          <Label htmlFor="mbd-score">Minimum MBD Score</Label>
          <Input
            id="mbd-score"
            type="number"
            step="0.1"
            min="0"
            max="1"
            value={minimumMBDScore}
            onChange={handleMBDScoreChange}
            placeholder="Enter minimum MBD score (0.0 - 1.0)"
            disabled={loading}
          />
        </FormGroup>
      </Box>

      <Box mb="lg">
        <Button
          onClick={handleSave}
          disabled={loading}
          variant="primary"
          size="lg"
        >
          {loading ? 'Saving...' : 'Save Configuration'}
        </Button>
      </Box>

      {message && (
        <Box mb="md">
          <Text color="green">{message}</Text>
        </Box>
      )}

      {error && (
        <Box mb="md">
          <Text color="red">{error}</Text>
        </Box>
      )}

      <Box mt="lg" p="md" variant="grey100">
        <Text variant="sm" color="grey600">
          <strong>Note:</strong> These settings will apply globally to all QF
          rounds. Individual QF rounds can override these values if needed.
        </Text>
      </Box>
    </Box>
  );
};

export default withTheme(GlobalConfigComponent);
