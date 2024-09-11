// components/CustomQfRoundReferenceListComponent.jsx
import React from 'react';
import { Link } from '@adminjs/design-system';

const CustomQfRoundReferenceListComponent = props => {
  const { record } = props;
  const qfRoundId =
    record.params.qfRound?.id || record.params.qfRoundId || 'N/A';
  const href = `/admin/resources/QfRound/records/${qfRoundId}/show`;

  return <Link href={href}>QF Round {qfRoundId}</Link>;
};

export default CustomQfRoundReferenceListComponent;
