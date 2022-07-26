import React from 'react'
import { withTheme } from 'styled-components'
import { Section, Label, Link } from '@admin-bro/design-system'

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
    <div>
      <Label>Project Milestones</Label>

      <Section>
        <Section>
          <Label>
            Foundation date
          </Label>
          {foundationDate}
        </Section>
        <Section>
          <Label>
            Mission
          </Label>
          {mission}
        </Section>
        <Section>
          <Label>
              Achieved Milestones
          </Label>
          {achievedMilestones}
        </Section>

        <Section>
          <Label>
              Milestones Proofs
          </Label>

          {proofs.map(proof => {
            return (<div key={proof}> <br /><Link href={proof}>{proof}</Link></div>)
          })}
        </Section>
      </Section>
      <br/>

    </div>
  )
}

export default withTheme(VerificationFormMilestones)
