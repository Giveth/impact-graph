import React from 'react'
import Select from 'react-select/async'
import { withTheme } from 'styled-components'
import { FormGroup, filterStyles, Label } from '@admin-bro/design-system'

const VerificationFormMilestones = props => {
  console.log('VerificationFormMilestones props.record.params', props.record.params)
  const proofs = []
  Object.keys(props.record.params).forEach(key => {
    if (key.startsWith('milestones.achievedMilestonesProofs.')) {
      proofs.push(props.record.params[key])
    }
  })
  const foundationDate = props?.record?.params?.['milestones.foundationDate'] || ''
  const achievedMilestones = props?.record?.params?.['milestones.achievedMilestones'] || ''
  const mission = props?.record?.params?.['milestones.mission'] || ''
  return (
    <section className='sc-dIsAE lcuJrN admin-bro_Box'>
      <label className='sc-dlnjPT fyQNXW admin-bro_Label'>Project Milestones</label>
      <section className='sc-dIsAE sc-ezzayL fbPpRS iCFaRU admin-bro_Section'>
        <section className='sc-dIsAE fbPpRS admin-bro_Box'>
          <section className='sc-dIsAE lcuJrN admin-bro_Box'>
            <label className='sc-dlnjPT fyQNXW admin-bro_Label'>
            Foundation date
            </label>
            {foundationDate}
          </section>
          <section className='sc-dIsAE lcuJrN admin-bro_Box'>
            <label className='sc-dlnjPT fyQNXW admin-bro_Label'>
            Mission
            </label>
            {mission}
          </section>
          <section className='sc-dIsAE lcuJrN admin-bro_Box'>
            <label className='sc-dlnjPT fyQNXW admin-bro_Label'>
              Achieved Milestones
            </label>
            {achievedMilestones}
          </section>

          <section className='sc-dIsAE lcuJrN admin-bro_Box'>
            <label className='sc-dlnjPT fyQNXW admin-bro_Label'>
              Milestones Proofs
            </label>

            {proofs.map(proof => {
              return (<div key={proof}> <br /><a href={proof}>{proof}</a></div>)
            })}
          </section>
        </section>
      </section>
    </section>
  )
}

export default withTheme(VerificationFormMilestones)
