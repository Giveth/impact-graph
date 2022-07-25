import React from 'react'
import { withTheme } from 'styled-components'

const VerificationFormSocials = props => {
  console.log('VerificationFormSocials props.record.params', props.record.params)
  const socials = props?.record?.params?.socials

  return (
    <section className='sc-dIsAE lcuJrN admin-bro_Box'>
      <label className='sc-dlnjPT fyQNXW admin-bro_Label'>Project Socials</label>
      <section className='sc-dIsAE sc-ezzayL fbPpRS iCFaRU admin-bro_Section'>
        <section className='sc-dIsAE fbPpRS admin-bro_Box'>

          {socials.map(social => {
            const { link, name, socialNetworkId, isVerified, socialNetwork } = social
            return (
              <div key={socialNetworkId}>
                <br />
                <section className='sc-dIsAE sc-ezzayL fbPpRS iCFaRU admin-bro_Section'>
                  <h1>
                    {socialNetwork}
                  </h1>
                  <br />
                  <section className='sc-dIsAE lcuJrN admin-bro_Box'>
                    <label className='sc-dlnjPT fyQNXW admin-bro_Label'>
                    Name
                    </label>
                    {name || ''}
                  </section>
                  <section className='sc-dIsAE lcuJrN admin-bro_Box'>
                    <label className='sc-dlnjPT fyQNXW admin-bro_Label'>
                    Social network id
                    </label>
                    {socialNetworkId}
                  </section>
                  <section className='sc-dIsAE lcuJrN admin-bro_Box'>
                    <label className='sc-dlnjPT fyQNXW admin-bro_Label'>
                    Verified
                    </label>
                    <span fontSize='sm' className='sc-bdnylx efSokc admin-bro_Badge'>{isVerified ? 'Yes' : 'No'}</span>
                  </section>
                  <section className='sc-dIsAE lcuJrN admin-bro_Box'>
                    <label className='sc-dlnjPT fyQNXW admin-bro_Label'>
                    Link
                    </label>
                    <a href={link || ''}>{link || ''}</a>
                  </section>

                </section>
              </div>

            )
          })}

        </section>
      </section>
    </section>
  )
}

export default withTheme(VerificationFormSocials)
