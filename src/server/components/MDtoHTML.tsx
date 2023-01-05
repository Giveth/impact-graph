import { useState, ChangeEvent } from 'react';
import styled, { withTheme } from 'styled-components';
import { Label, TextArea } from '@admin-bro/design-system';
import React from 'react';
import marked from 'marked'

const MDtoHTML = props => {
  console.log('props', props);
  const { record, property, onChange, resource } = props
  const value = record.params[property.path]
  const [md, setMd] = useState(value);
  const [html, setHtml] = useState('')
  const onChangeHandler = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setMd(e.currentTarget.value)
    const _html = marked.parse(e.currentTarget.value)
    setHtml(_html);
    // props.onChange({md: e.currentTarget.value, html: _html})
  };
  const params = JSON.stringify(record.params)

  return (
    <div>
      <Label>{record.label}</Label>
	    <StyledTextArea onChange={onChangeHandler} value={md} />
      <MDRender dangerouslySetInnerHTML={{__html: html}} />
    </div>
  );
};


const StyledTextArea = styled(TextArea)`
  min-width:  100% ;
  resize: vertical ;
  margin-bottom: 32px ;
`;

const MDRender = styled.div`
  margin-bottom: 32px ;
  strong {
    font-weight: bold !important;
  }
`;


export default withTheme(MDtoHTML);
