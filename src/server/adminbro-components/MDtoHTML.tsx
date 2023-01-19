// @ts-ignore
import React from 'react';
import { useState, ChangeEvent } from 'react';
import styled, { withTheme } from 'styled-components';
import { Label, TextArea } from '@adminjs/design-system';
import { marked } from 'marked';

const MDtoHTML = props => {
  const { record, property } = props;
  const value = record.params[property.path];
  const [md, setMd] = useState(value);
  const [html, setHtml] = useState('');
  const onChangeHandler = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setMd(e.currentTarget.value);
    const _html = marked.parse(e.currentTarget.value);
    record.params.html = _html;
    setHtml(_html);
  };

  return (
    <div>
      <Label>Markdown</Label>
      <StyledTextArea onChange={onChangeHandler} value={md} rows={4} />
      <Label>Preview</Label>
      <MDRender dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
};

const StyledTextArea = styled(TextArea)`
  min-width: 100%;
  resize: vertical;
  margin-bottom: 32px;
`;

const MDRender = styled.div`
  border: 1px solid #c0c0ca;
  border-radius: 4px;
  padding: 24px;
  margin-bottom: 32px;
  strong {
    font-weight: bold !important;
  }
  a {
    text-decoration: none;
    color: #e1458d;
  }
  ul {
    list-style-type: disc !important;
  }
`;

export default withTheme(MDtoHTML);
