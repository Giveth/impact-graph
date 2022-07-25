import React from 'react'
import Select from 'react-select/async'
import { withTheme } from 'styled-components'
import { FormGroup, filterStyles, Label } from '@admin-bro/design-system'

const VerificationFormProjectRegistry = props => {
  console.log('VerificationFormProjectRegistry props.record.params', props.record.params)
  const isNonProfit = props?.record?.params?.['projectRegistry.isNonProfitOrganization']
  const website = props?.record?.params?.['projectRegistry.organizationWebsite'] || ''
  const description = props?.record?.params?.['projectRegistry.organizationDescription'] || ''
  const name = props?.record?.params?.['projectRegistry.organizationName'] || ''
  const country = props?.record?.params?.['projectRegistry.organizationCountry'] || ''
  const attachments = []
  Object.keys(props.record.params).forEach(key => {
    if (key.startsWith('projectRegistry.attachments.')) {
      attachments.push(props.record.params[key])
    }
  })

  return (
    <section className='sc-dIsAE lcuJrN admin-bro_Box'>
      <label className='sc-dlnjPT fyQNXW admin-bro_Label'>Project Registry</label>
      <section className='sc-dIsAE sc-ezzayL fbPpRS iCFaRU admin-bro_Section'>
        <section className='sc-dIsAE fbPpRS admin-bro_Box'>
          <section className='sc-dIsAE lcuJrN admin-bro_Box'>
            <label className='sc-dlnjPT fyQNXW admin-bro_Label'>
              Project Registry Is Non Profit Organization
            </label>
            <span fontSize='sm' className='sc-bdnylx efSokc admin-bro_Badge'>{isNonProfit ? 'Yes' : 'No'}</span>
          </section>
          <section className='sc-dIsAE lcuJrN admin-bro_Box'>
            <label className='sc-dlnjPT fyQNXW admin-bro_Label'>
            Organization Country
            </label>
            {country}
          </section>
          <section className='sc-dIsAE lcuJrN admin-bro_Box'>
            <label className='sc-dlnjPT fyQNXW admin-bro_Label'>
              Organization Name
            </label>
            {name}
          </section>

          <section className='sc-dIsAE lcuJrN admin-bro_Box'>
            <label className='sc-dlnjPT fyQNXW admin-bro_Label'>
              Organization Description
            </label>
            {description}
          </section>

          <section className='sc-dIsAE lcuJrN admin-bro_Box'>
            <label className='sc-dlnjPT fyQNXW admin-bro_Label'>
              Organization Website
            </label>
            {<a href={website}>{website}</a>}
          </section>

          <section className='sc-dIsAE lcuJrN admin-bro_Box'>
            <label className='sc-dlnjPT fyQNXW admin-bro_Label'>
              Attachments
            </label>

            {attachments.map(attachment => {
              return (<div key={attachment}> <br /><a href={attachment}>{attachment}</a></div>)
            })}
          </section>
        </section>
      </section>
    </section>
  )
}

export default withTheme(VerificationFormProjectRegistry)
