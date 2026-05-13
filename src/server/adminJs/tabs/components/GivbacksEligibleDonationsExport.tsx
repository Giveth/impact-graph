import React, { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Input,
  Label,
  Select,
  Text,
} from '@adminjs/design-system';
import { ApiClient } from 'adminjs';

const api = new ApiClient();

const downloadCsv = (csvContent: string, fileName: string) => {
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(anchor);
};

const FilterField = ({
  label,
  name,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
}) => (
  <Box mb="lg" width={['100%', '48%']}>
    <Label>{label}</Label>
    <Input
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  </Box>
);

const GivbacksEligibleDonationsExport = props => {
  const { resource } = props;
  const [filters, setFilters] = useState({
    fromDate: '',
    toDate: '',
    networkId: '',
    projectId: '',
    userId: '',
    isEligibleForGivbacks: '',
  });
  const [isExporting, setIsExporting] = useState(false);
  const [isLoadingThresholds, setIsLoadingThresholds] = useState(true);
  const [thresholds, setThresholds] = useState<{
    defaultMinimumUsdAmount: number;
    communityOfMakersMinimumUsdAmount: number;
  } | null>(null);

  useEffect(() => {
    const loadThresholds = async () => {
      setIsLoadingThresholds(true);

      try {
        const { data } = await api.resourceAction({
          resourceId: resource.id,
          actionName: 'exportGivbacksEligibleDonations',
        });

        if (data && data.thresholds) {
          setThresholds(data.thresholds);
        }
      } catch {
        setThresholds(null);
      } finally {
        setIsLoadingThresholds(false);
      }
    };

    loadThresholds();
  }, [resource.id]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setFilters(current => ({ ...current, [name]: value }));
  };

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const { data } = await api.resourceAction({
        resourceId: resource.id,
        actionName: 'exportGivbacksEligibleDonations',
        method: 'post',
        data: filters,
      });

      if (data && data.csvContent) {
        downloadCsv(
          data.csvContent,
          data.fileName || 'givbacks-eligible-donations.csv',
        );
      }

      if (data && data.notice && data.notice.message) {
        alert(data.notice.message);
      }
    } catch (error) {
      alert(
        `Export failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Box variant="grey">
      <Box variant="white" p="xl">
        <Text fontSize="xl" fontWeight="bold" mb="default">
          Export GivBack Eligible Donations
        </Text>
        <Text mb="xl" color="grey60">
          Download a CSV of verified donations evaluated against the current
          GivBack eligibility rules. All filters are optional.
        </Text>
        <Box display="flex" flexWrap="wrap" justifyContent="space-between">
          <FilterField
            label="From date"
            name="fromDate"
            value={filters.fromDate}
            onChange={handleChange}
            placeholder="2026-01-01"
          />
          <FilterField
            label="To date"
            name="toDate"
            value={filters.toDate}
            onChange={handleChange}
            placeholder="2026-12-31"
          />
          <FilterField
            label="Network ID"
            name="networkId"
            value={filters.networkId}
            onChange={handleChange}
            placeholder="10"
          />
          <FilterField
            label="Project ID"
            name="projectId"
            value={filters.projectId}
            onChange={handleChange}
            placeholder="123"
          />
          <FilterField
            label="User ID"
            name="userId"
            value={filters.userId}
            onChange={handleChange}
            placeholder="456"
          />
          <Box mb="lg" width={['100%', '48%']}>
            <Label>Eligibility</Label>
            <Select
              value={
                [
                  { value: '', label: 'All donations' },
                  { value: 'true', label: 'Eligible only' },
                  { value: 'false', label: 'Ineligible only' },
                ].find(
                  option => option.value === filters.isEligibleForGivbacks,
                ) || null
              }
              onChange={selected =>
                setFilters(current => ({
                  ...current,
                  isEligibleForGivbacks: selected?.value || '',
                }))
              }
              options={[
                { value: '', label: 'All donations' },
                { value: 'true', label: 'Eligible only' },
                { value: 'false', label: 'Ineligible only' },
              ]}
              isClearable
            />
          </Box>
        </Box>
        <Text mb="xl" color="grey60" fontSize="sm">
          {isLoadingThresholds
            ? 'Loading current thresholds...'
            : thresholds
              ? `Current thresholds: ${thresholds.defaultMinimumUsdAmount} USD by default, and ${thresholds.communityOfMakersMinimumUsdAmount} USD for giveth-community-of-makers.`
              : 'Thresholds use the default GivBack export values.'}
        </Text>
        <Button
          onClick={handleExport}
          disabled={isExporting || isLoadingThresholds}
          variant="primary"
          size="lg"
          isLoading={isExporting}
        >
          {isLoadingThresholds
            ? 'Loading thresholds...'
            : isExporting
              ? 'Exporting...'
              : 'Download CSV'}
        </Button>
      </Box>
    </Box>
  );
};

export default GivbacksEligibleDonationsExport;
