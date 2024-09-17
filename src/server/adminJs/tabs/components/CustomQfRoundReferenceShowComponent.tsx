// components/CustomQfRoundReferenceShowComponent.jsx
import React from 'react';
import { Link, ValueGroup } from '@adminjs/design-system';

const CustomQfRoundReferenceShowComponent = props => {
  const { record } = props;
  const qfRoundId =
    record.params.qfRound?.id || record.params.qfRoundId || 'N/A';
  const href = `/admin/resources/QfRound/records/${qfRoundId}/show`;

  return (
    <ValueGroup label="QF Round">
      <Link href={href} style={{ color: 'inherit', textDecoration: 'none' }}>
        {qfRoundId}
      </Link>
    </ValueGroup>
  );
};

export default CustomQfRoundReferenceShowComponent;
