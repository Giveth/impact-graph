import config from './config';
import { getRepository, Column, ColumnOptions } from 'typeorm'
import * as bcrypt from 'bcryptjs'

import { Organisation } from './entities/organisation'
import { OrganisationUser } from './entities/organisationUser'
// import { OrganisationProject } from './entities/organisationProject'
import { Project } from './entities/project'
import { Category } from './entities/category'
import { User } from './entities/user'

export async function seedDatabase () {
  const categoryRepository = getRepository(Category)
  const projectRepository = getRepository(Project)
  const organisationRepository = getRepository(Organisation)
  const organisationUserRepository = getRepository(OrganisationUser)
  // const organisationProjectRepository = getRepository(OrganisationProject)
  const userRepository = getRepository(User)

  const seedPassword = config.get('SEED_PASSWORD').toString()
  const serverEmail = config.get('SERVER_ADMIN_EMAIL').toString()
  let users: User[] = []

  /** 
   * { name: 'sdg-poverty', value: 'End Poverty', source: 'SDG' },
    { name: 'sdg-hunger', value: 'Zero Hunger', source: 'SDG' },
    { name: 'sdg-health', value: 'Good Health and Well-being', source: 'SDG' },
    { name: 'sdg-education', value: 'Quality Education', source: 'SDG' },
    { name: 'sdg-gender-equality', value: 'Gender Equality', source: 'SDG' },
    { name: 'sdg-clean-water', value: 'Clean Water and Sanitation', source: 'SDG' },
    { name: 'sdg-energy', value: 'Affordable and Clean Energy', source: 'SDG' },
    { name: 'sdg-economic-growth', value: 'Decent Work and Economic Growth', source: 'SDG' },
    { name: 'sdg-innovation-infrastructure', value: 'Industry, Innovation and Infrastructure', source: 'SDG' },
    { name: 'sdg-reduce-inequality', value: 'Reduced Inequality', source: 'SDG' },
    { name: 'sdg-sustainable-communities', value: 'Sustainable Cities and Communities', source: 'SDG' },
    { name: 'sdg-responsible-production', value: 'Responsible Consumption and Production', source: 'SDG' },
    { name: 'sdg-climate-action', value: 'Climate Action', source: 'SDG' },
    { name: 'sdg-life-water', value: 'Life Below Water', source: 'SDG' },
    { name: 'sdg-life-land', value: 'Life On Land', source: 'SDG' },
    { name: 'sdg-justice', value: 'Peace and Justice Strong Institutions', source: 'SDG' },
    { name: 'sdg-partnership  ', value: 'Partnerships to achieve the Goal', source: 'SDG' },
   */
  const categorySeeds = categoryRepository.create([
    { name: 'community', value: 'Community', source: 'adhoc' },
    { name: 'food', value: 'Food', source: 'adhoc' },
    { name: 'non-profit', value: 'Non-profit', source: 'adhoc' },
    { name: 'housing', value: 'Housing', source: 'adhoc' },
    { name: 'technology', value: 'Technology', source: 'adhoc' },
    { name: 'agriculture', value: 'Agriculture', source: 'IRIS'},
    { name: 'air', value: 'Air', source: 'IRIS'},
    { name: 'biodiversity', value: 'Biodiversity', source: 'IRIS'},
    { name: 'climate', value: 'Climate', source: 'IRIS'},
    { name: 'inclusion', value: 'Inclusion', source: 'IRIS'},
    { name: 'education', value: 'Education', source: 'IRIS'},
    { name: 'employment', value: 'Employment', source: 'IRIS'},
    { name: 'energy', value: 'Energy', source: 'IRIS'},
    { name: 'finance', value: 'Finance', source: 'IRIS'},
    { name: 'health', value: 'Health', source: 'IRIS'},
    { name: 'infrastructure', value: 'Infrastructure', source: 'IRIS'},
    { name: 'land', value: 'Land', source: 'IRIS'},
    { name: 'oceans', value: 'Oceans', source: 'IRIS'},
    { name: 'pollution', value: 'Pollution', source: 'IRIS'},
    { name: 'real-estate', value: 'Real Estate', source: 'IRIS'},
    { name: 'waste', value: 'Waste', source: 'IRIS'},
    { name: 'water', value: 'Water', source: 'IRIS'},
    { name: 'other', value: 'Other', source: 'adhoc' }
    
  ])

  await categoryRepository.save(categorySeeds)
  
  const superAdminUser = userRepository.create({
    email: serverEmail,
    firstName: 'admin',
    password: bcrypt.hashSync(seedPassword, 12),
    confirmed: true,
    loginType: 'password'
  })

  users.push(superAdminUser)

  let projects: Project[] = []
  let organisations: Organisation[] = []
  
  if(config.get('DEFAULT_ORGANISATION') === 'giveth' ) {
    const givethAdmin = userRepository.create({
      email: 'james@giveth.io',
      firstName: 'admin',
      password: bcrypt.hashSync(seedPassword, 12),
      confirmed: true,
      loginType: 'password'
    })
    users.push(givethAdmin)
    await userRepository.save(users)
    const project1 = projectRepository.create({
      title: 'Giveth',
      description: `The future of Giving
      Unlike traditional charity, with Giveth every donation and pledge is transparent, so you always know exactly where your donation went and get a good sense of the impact it made in direct communication with your beneficiary.`,
      organisationId: 1,
      admin: 'giveth',
      walletAddress: 'revolution.eth',
      slug: 'giveth',
      image: 'data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiIHN0YW5kYWxvbmU9Im5vIj8+CjwhLS0gQ3JlYXRlZCB3aXRoIElua3NjYXBlIChodHRwOi8vd3d3Lmlua3NjYXBlLm9yZy8pIC0tPgoKPHN2ZwogICB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iCiAgIHhtbG5zOmNjPSJodHRwOi8vY3JlYXRpdmVjb21tb25zLm9yZy9ucyMiCiAgIHhtbG5zOnJkZj0iaHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyIKICAgeG1sbnM6c3ZnPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIKICAgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIgogICB4bWxuczpzb2RpcG9kaT0iaHR0cDovL3NvZGlwb2RpLnNvdXJjZWZvcmdlLm5ldC9EVEQvc29kaXBvZGktMC5kdGQiCiAgIHhtbG5zOmlua3NjYXBlPSJodHRwOi8vd3d3Lmlua3NjYXBlLm9yZy9uYW1lc3BhY2VzL2lua3NjYXBlIgogICB3aWR0aD0iMTkzMC4xNzMzIgogICBoZWlnaHQ9IjE5MzEuNjgyMSIKICAgdmlld0JveD0iMCAwIDUxMC42OTE2OCA1MTEuMDkwODgiCiAgIHZlcnNpb249IjEuMSIKICAgaWQ9InN2Zzg2MCIKICAgaW5rc2NhcGU6dmVyc2lvbj0iMC45Mi4zICgyNDA1NTQ2LCAyMDE4LTAzLTExKSIKICAgc29kaXBvZGk6ZG9jbmFtZT0iZ2l2ZXRoLXN5bWJvbC1sb2dvLXB1cnBsZS5zdmciPgogIDxkZWZzCiAgICAgaWQ9ImRlZnM4NTQiPgogICAgPGNsaXBQYXRoCiAgICAgICBjbGlwUGF0aFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIKICAgICAgIGlkPSJjbGlwUGF0aDE4Ij4KICAgICAgPHBhdGgKICAgICAgICAgZD0iTSAwLDIwNTAuOTkyIEggMTQ0Ny42MzIgViAwIEggMCBaIgogICAgICAgICBpZD0icGF0aDE2IgogICAgICAgICBpbmtzY2FwZTpjb25uZWN0b3ItY3VydmF0dXJlPSIwIiAvPgogICAgPC9jbGlwUGF0aD4KICAgIDxjbGlwUGF0aAogICAgICAgY2xpcFBhdGhVbml0cz0idXNlclNwYWNlT25Vc2UiCiAgICAgICBpZD0iY2xpcFBhdGgyNiI+CiAgICAgIDxwYXRoCiAgICAgICAgIGQ9Ik0gMCwyMDUwLjk5IEggMTQ0Ny42MyBWIDAgSCAwIFoiCiAgICAgICAgIGlkPSJwYXRoMjQiCiAgICAgICAgIGlua3NjYXBlOmNvbm5lY3Rvci1jdXJ2YXR1cmU9IjAiIC8+CiAgICA8L2NsaXBQYXRoPgogIDwvZGVmcz4KICA8c29kaXBvZGk6bmFtZWR2aWV3CiAgICAgaWQ9ImJhc2UiCiAgICAgcGFnZWNvbG9yPSIjZmZmZmZmIgogICAgIGJvcmRlcmNvbG9yPSIjNjY2NjY2IgogICAgIGJvcmRlcm9wYWNpdHk9IjEuMCIKICAgICBpbmtzY2FwZTpwYWdlb3BhY2l0eT0iMC4wIgogICAgIGlua3NjYXBlOnBhZ2VzaGFkb3c9IjIiCiAgICAgaW5rc2NhcGU6em9vbT0iMC4zNSIKICAgICBpbmtzY2FwZTpjeD0iNjQ1LjA4NjY1IgogICAgIGlua3NjYXBlOmN5PSI2NjAuMTI2NzMiCiAgICAgaW5rc2NhcGU6ZG9jdW1lbnQtdW5pdHM9InB4IgogICAgIGlua3NjYXBlOmN1cnJlbnQtbGF5ZXI9ImxheWVyMSIKICAgICBzaG93Z3JpZD0iZmFsc2UiCiAgICAgaW5rc2NhcGU6d2luZG93LXdpZHRoPSIxOTIwIgogICAgIGlua3NjYXBlOndpbmRvdy1oZWlnaHQ9IjExNzEiCiAgICAgaW5rc2NhcGU6d2luZG93LXg9IjAiCiAgICAgaW5rc2NhcGU6d2luZG93LXk9IjAiCiAgICAgaW5rc2NhcGU6d2luZG93LW1heGltaXplZD0iMSIKICAgICBmaXQtbWFyZ2luLXRvcD0iMCIKICAgICBmaXQtbWFyZ2luLWxlZnQ9IjAiCiAgICAgZml0LW1hcmdpbi1yaWdodD0iMCIKICAgICBmaXQtbWFyZ2luLWJvdHRvbT0iMCIKICAgICB1bml0cz0icHgiIC8+CiAgPG1ldGFkYXRhCiAgICAgaWQ9Im1ldGFkYXRhODU3Ij4KICAgIDxyZGY6UkRGPgogICAgICA8Y2M6V29yawogICAgICAgICByZGY6YWJvdXQ9IiI+CiAgICAgICAgPGRjOmZvcm1hdD5pbWFnZS9zdmcreG1sPC9kYzpmb3JtYXQ+CiAgICAgICAgPGRjOnR5cGUKICAgICAgICAgICByZGY6cmVzb3VyY2U9Imh0dHA6Ly9wdXJsLm9yZy9kYy9kY21pdHlwZS9TdGlsbEltYWdlIiAvPgogICAgICAgIDxkYzp0aXRsZT48L2RjOnRpdGxlPgogICAgICA8L2NjOldvcms+CiAgICA8L3JkZjpSREY+CiAgPC9tZXRhZGF0YT4KICA8ZwogICAgIGlua3NjYXBlOmxhYmVsPSJMYXllciAxIgogICAgIGlua3NjYXBlOmdyb3VwbW9kZT0ibGF5ZXIiCiAgICAgaWQ9ImxheWVyMSIKICAgICB0cmFuc2Zvcm09InRyYW5zbGF0ZSgyODMuMzE2MDgsMTg3LjU5OTAxKSI+CiAgICA8ZwogICAgICAgdHJhbnNmb3JtPSJtYXRyaXgoMC4zNTI3Nzc3NywwLDAsLTAuMzUyNzc3NzcsLTI4My4zMTYwOCw1MzUuOTQ1MzQpIgogICAgICAgaWQ9ImcxMiIKICAgICAgIHN0eWxlPSJmaWxsOiMyZjAzNDA7ZmlsbC1vcGFjaXR5OjEiPgogICAgICA8ZwogICAgICAgICBpZD0iZzE0IgogICAgICAgICBjbGlwLXBhdGg9InVybCgjY2xpcFBhdGgxOCkiCiAgICAgICAgIHN0eWxlPSJmaWxsOiMyZjAzNDA7ZmlsbC1vcGFjaXR5OjEiPgogICAgICAgIDxnCiAgICAgICAgICAgaWQ9ImcyMCIKICAgICAgICAgICBzdHlsZT0iZmlsbDojMmYwMzQwO2ZpbGwtb3BhY2l0eToxIgogICAgICAgICAgIHRyYW5zZm9ybT0ibWF0cml4KDEsMCwwLDAuNzA2MzcwOTEsMCw2MDIuMjMwMzMpIj4KICAgICAgICAgIDxnCiAgICAgICAgICAgICBpZD0iZzIyIgogICAgICAgICAgICAgc3R5bGU9ImZpbGw6IzJmMDM0MDtmaWxsLW9wYWNpdHk6MSIgLz4KICAgICAgICAgIDxnCiAgICAgICAgICAgICBpZD0iZzMyIgogICAgICAgICAgICAgc3R5bGU9ImZpbGw6IzJmMDM0MDtmaWxsLW9wYWNpdHk6MSI+CiAgICAgICAgICAgIDxnCiAgICAgICAgICAgICAgIGNsaXAtcGF0aD0idXJsKCNjbGlwUGF0aDI2KSIKICAgICAgICAgICAgICAgaWQ9ImczMCIKICAgICAgICAgICAgICAgc3R5bGU9Im9wYWNpdHk6MDtmaWxsOiMyZjAzNDA7ZmlsbC1vcGFjaXR5OjEiPgogICAgICAgICAgICAgIDxwYXRoCiAgICAgICAgICAgICAgICAgZD0iTSAwLDIwNTAuOTkyIEggMTQ0Ny42MzIgViAwIEggMCBaIgogICAgICAgICAgICAgICAgIHN0eWxlPSJmaWxsOiMyZjAzNDA7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOm5vbnplcm87c3Ryb2tlOm5vbmUiCiAgICAgICAgICAgICAgICAgaWQ9InBhdGgyOCIKICAgICAgICAgICAgICAgICBpbmtzY2FwZTpjb25uZWN0b3ItY3VydmF0dXJlPSIwIiAvPgogICAgICAgICAgICA8L2c+CiAgICAgICAgICA8L2c+CiAgICAgICAgPC9nPgogICAgICAgIDxnCiAgICAgICAgICAgaWQ9ImczNCIKICAgICAgICAgICB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxNDQ3LjUxMTcsMTMwOS40OTU4KSIKICAgICAgICAgICBzdHlsZT0iZmlsbDojMmYwMzQwO2ZpbGwtb3BhY2l0eToxIj4KICAgICAgICAgIDxwYXRoCiAgICAgICAgICAgICBkPSJtIDAsMCBjIC0xLjQyLC0yMC4zNDQgLTEuOTIsLTQwLjgxIC00LjQxNCwtNjEuMDM2IC0yNi4zOTYsLTIxNC4zOTQgLTEyNi4zOTksLTM4Ni4xOTMgLTMwMS45MzQsLTUxMi4wMyAtMTMxLjEzMSwtOTQuMDAyIC0yNzkuMTMzLC0xMzcuODY2IC00NDAuMzM2LC0xMzIuMjg4IC0xODYuNDA0LDYuNDY4IC0zNDcuMTIsNzUuODk0IC00ODEuODgyLDIwNC44NTYgLTEuMjM4LDEuMTk2IC0xLjIwOCw1Ljk0MiAwLDcuMjEgMTY4LjA4LDE2OC4zNDQgMzM2LjMxNywzMzYuNTE3IDUwNC43MTEsNTA0LjUyIDMuOTY3LDMuNjM2IDkuMTAxLDUuNzQgMTQuNDgxLDUuOTQgMjM2LjQ2MywwLjI5MiA0NzIuOTIxLDAuMzc3IDcwOS4zNzQsMC4yNTYgeiIKICAgICAgICAgICAgIHN0eWxlPSJmaWxsOiMyZjAzNDA7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOm5vbnplcm87c3Ryb2tlOm5vbmUiCiAgICAgICAgICAgICBpZD0icGF0aDM2IgogICAgICAgICAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT0iMCIgLz4KICAgICAgICA8L2c+CiAgICAgICAgPGcKICAgICAgICAgICBpZD0iZzM4IgogICAgICAgICAgIHRyYW5zZm9ybT0idHJhbnNsYXRlKDc0MS40NTAyLDIwNTAuOTkxOSkiCiAgICAgICAgICAgc3R5bGU9ImZpbGw6IzJmMDM0MDtmaWxsLW9wYWNpdHk6MSI+CiAgICAgICAgICA8cGF0aAogICAgICAgICAgICAgZD0ibSAwLDAgYyAxOS44OCwtMS41MTIgMzkuODA0LC0yLjM4OCA1OS42MDcsLTQuNTM0IDExNi4wMTUsLTEyLjU2NyAyMjIuODQ4LC01MC44NTkgMzIwLjQ5OCwtMTE0Ljg3NiAwLjY2NSwtMC41IDEuMywtMS4wMzQgMS45MDcsLTEuNjAyIGwgLTYxLjc0MiwtNjEuNjEgYyAtMTMuNDQsLTEzLjQwOCAtMjYuNzg5LC0yNi45MDYgLTQwLjM5NCwtNDAuMTQ4IC0xLjc0NiwtMS4xMjYgLTMuOTM3LC0xLjMxOCAtNS44NTEsLTAuNTE0IC05OC4zMjYsNTYuNTcyIC0yMDQuMTY2LDgyLjU5MSAtMzE3LjUxOSw3OC4wNTYgLTI1My42MDIsLTEwLjIxOCAtNDc0LjcsLTE4OS44MzIgLTUzNS41MDQsLTQzNi4xMjIgLTM3LjY0NCwtMTUyLjYwNCAtMTYuNzA2LC0yOTcuNTc0IDYwLjgwNCwtNDM0LjM5OCAwLjc0LC0xLjMgMC43ODYsLTQuMTcyIC0wLjEwNiwtNS4wNDggLTMzLjY1MiwtMzMuODk4IC02Ny40MTUsLTY3LjcwNyAtMTAxLjI5LC0xMDEuNDI0IC0wLjMzMiwtMC4zMzIgLTAuNzQsLTAuNjA0IC0xLjUxMiwtMS4yMjQgLTMuMTksNC45NDIgLTYuMzk0LDkuNzIgLTkuNDE4LDE0LjYwMiAtODMuNTg2LDEzNS4xNzYgLTEyMC40ODgsMjgyLjAzNiAtMTA4LjU0Niw0NDAuNTUgMjQuODg0LDMyOS41MjggMjcwLjE3LDU5OS41MDIgNTk2LjU1LDY1Ni44MzQgMzIuOTg2LDUuNzkgNjYuNzQ0LDcuMjU2IDEwMC4xNCwxMC43MzIgTCAtMzUuNTU4LDAgWiIKICAgICAgICAgICAgIHN0eWxlPSJmaWxsOiMyZjAzNDA7ZmlsbC1vcGFjaXR5OjE7ZmlsbC1ydWxlOm5vbnplcm87c3Ryb2tlOm5vbmUiCiAgICAgICAgICAgICBpZD0icGF0aDQwIgogICAgICAgICAgICAgaW5rc2NhcGU6Y29ubmVjdG9yLWN1cnZhdHVyZT0iMCIgLz4KICAgICAgICA8L2c+CiAgICAgICAgPGcKICAgICAgICAgICBpZD0iZzQyIgogICAgICAgICAgIHRyYW5zZm9ybT0idHJhbnNsYXRlKDExMDguMzAzNywxNjE0LjE3MDIpIgogICAgICAgICAgIHN0eWxlPSJmaWxsOiMyZjAzNDA7ZmlsbC1vcGFjaXR5OjEiPgogICAgICAgICAgPHBhdGgKICAgICAgICAgICAgIGQ9Ik0gMCwwIEMgLTAuMDE0LDcyLjAwMiA1OC4zMzIsMTMwLjM5NiAxMzAuMzQ3LDEzMC40NSAyMDIuMzYsMTMwLjUwNiAyNjAuNzk0LDcyLjIwMiAyNjAuODg5LDAuMiAyNjAuOTg0LC03MS44MDIgMjAyLjcwNCwtMTMwLjI2IDEzMC42OSwtMTMwLjM5NCA5Ni4wMzIsLTEzMC41NCA2Mi43NDgsLTExNi44NTYgMzguMjE0LC05Mi4zOCAxMy42ODMsLTY3LjkwMiAtMC4wNzEsLTM0LjY1MiAwLDAiCiAgICAgICAgICAgICBzdHlsZT0iZmlsbDojMmYwMzQwO2ZpbGwtb3BhY2l0eToxO2ZpbGwtcnVsZTpub256ZXJvO3N0cm9rZTpub25lIgogICAgICAgICAgICAgaWQ9InBhdGg0NCIKICAgICAgICAgICAgIGlua3NjYXBlOmNvbm5lY3Rvci1jdXJ2YXR1cmU9IjAiIC8+CiAgICAgICAgPC9nPgogICAgICA8L2c+CiAgICA8L2c+CiAgPC9nPgo8L3N2Zz4K'
    })
    projects.push(project1)
    organisations = organisationRepository.create([
      {
        title: 'Giveth',
        description: 'Giveth is the future of giving.'
      },
      {
        title: 'Gaia Protection',
        description:
          'The Madre Tierra Verde Foundation aims to contribute to the transition of Costa Rican society towards a paradigm of a green and intelligent society, following the guidelines of the National Strategy for Decarbonizing the Economy, through guidance and advice to organizations, communities and governments.'
      }
    ])
    await organisationRepository.save(organisations)
    const adminOrganisationUser = organisationUserRepository.create({
      role: 'admin',
      organisation: organisations[0],
      user: givethAdmin
    })
    
    await organisationUserRepository.save(adminOrganisationUser)
  } else {
    // Organisation 1
    const co2kenAdmin = userRepository.create({
      email: 'admin@co2ken.io',
      firstName: 'CO2ken',
      password: bcrypt.hashSync(seedPassword, 12),
      confirmed: true,
      loginType: 'password'
    })
    users.push(co2kenAdmin)
    await userRepository.save(users)
    const project1 = projectRepository.create({
      title: 'Ecoera',
      description: `Become Climate Positive
      We enable the Carbon Transformation by making your organisation go climate positive using carbon removal from our sustainable biochar carbon sink.`,
      organisationId: 2,
      admin: 'ecoera',
      walletAddress: '0x63A32F1595a68E811496D820680B74A5ccA303c5',
      slug: 'ecoera',
      image: 'https://cdn.shopify.com/s/files/1/2556/2892/files/BiokolBigbag_3000x.JPG?v=1511514366'
    })
    const project2 = projectRepository.create({
      title: 'REDD+ Papua New Guinea',
      description: `Why only Offsett and Reduce your carbon footprint? Our Validated, Verified, and Registered Carbon Credits conserve endangered tropical rainforests in Papua New Guinea and generate historical economic growth and social transformation for its people.`,
      organisationId: 2,
      admin: 'redd',
      walletAddress: '0x63A32F1595a68E811496D820680B74A5ccA303c5',
      slug: 'redd-papua-new-guinea',
      image: 'https://offsetra.com/agrocortex_banner.jpg'
    })
    projects.push(project1)
    projects.push(project2)

    organisations = organisationRepository.create([
      {
        title: 'CO2ken',
        description:
          'We tokenize carbon offsets to make them available for Ethereums web3 ecosystem.'
      },
      {
        title: 'Giveth',
        description: 'Giveth is the future of giving.'
      },
      {
        title: 'Gaia Protection',
        description:
          'The Madre Tierra Verde Foundation aims to contribute to the transition of Costa Rican society towards a paradigm of a green and intelligent society, following the guidelines of the National Strategy for Decarbonizing the Economy, through guidance and advice to organizations, communities and governments.'
      }
    ])
    await organisationRepository.save(organisations)
    const adminOrganisationUser = organisationUserRepository.create({
      role: 'admin',
      organisation: organisations[0],
      user: co2kenAdmin
    })
    await organisationUserRepository.save(adminOrganisationUser)
  }
  
  
  
  await projectRepository.save(projects)
  
  

  
  // Seed join table
  // const organisationProject = organisationProjectRepository.create({
  //   organisation: testOrganizations[0],
  //   project: covidProject
  // })
  // await organisationProjectRepository.save(organisationProject)

  

  // const icrcProjects = projectRepository.create([
  //   {
  //     title: 'COVID-19: ICRC global response to the coronavirus',
  //     description: `Professionals with a background in health, disaster management, water, sanitation, food and economic security, and logistics attended the 4th edition of the Regional HELP (Health Emergencies in Large Populations) course held in Delhi from 24 February to 6 March 2020. The two-week programme prepared participants, who came from nine countries, for effectively leading an emergency health response.

  //       In India, the HELP course is organized by the ICRC in partnership with International Institute of Health Management Research (IIHMR), National Institute of Disaster Management, World Health Organization (WHO) and the Indian Red Cross Society. It aims to enhance professionalism in health emergency response with an emphasis on decision-making. It uses the public health approach, fostering multidisciplinary responses and bringing out challenges, dilemmas, norms, standards and principles. This synergy between the field expertise of the ICRC and the academic expertise of IIHMR makes the course different from other HELP courses conducted around the world.`,
  //     organisations
  //   },
  //   {
  //     title:
  //       'India: HELP course trains professionals to effectively lead an emergency health response',
  //     description: `The COVID-19 pandemic (or coronavirus) is unprecedented in recent history and is spreading rapidly. It is not only a public health crisis, but also a humanitarian crisis in the making.

  //     In war-torn countries, COVID-19 represents a dramatic threat to life. Health systems have already been ravaged by violence, and the threat of further strain on health care from the coronavirus is an enormous risk for communities.

  //     Plans to prevent and respond to the virus must urgently move forward before it gains a foothold in countries in conflict.`,
  //     organisations
  //   }
  // ])
  // //organisations[0].projects = icrcProjects

  // const ifrcProjects = projectRepository.create([
  //   {
  //     title: 'Water, sanitation and hygiene promotion',
  //     description: `There are 7 billion people on the planet today and by 2050, we will have welcomed another 2 billion. Currently an estimated 2.5 billion do not have access to basic sanitation, and 1.1 billion of those people still practice open defecation (15 per cent of the world’s total population).

  //     This is not only ‘an affront to human dignity’, but also a serious public health issue as faecal–oral transmitted diseases such as diarrhoea, cause at least 1.5 million deaths per year in children under 5. Water is essential for human life, but it is not enough.

  //     In line with the old adage that prevention is better than cure, providing clinical health services without improving infrastructure and hygiene awareness is counterproductive, as too many resources are invested and ultimately wasted. We have seen historically that the biggest health advances at the start of the 20th century came as people earned higher incomes and enjoyed greater access to sewage systems, safe water supplies and medical care. Developing countries of today can expect similar advances in health, dignity and economic growth but only if sanitation is viewed as an equal priority.`,
  //     organisations
  //   },
  //   {
  //     title: 'Maternal, newborn, and child health',
  //     description: `Every year, 60 million women give birth at home with no access to skilled care. More than 500,000 women die from complications in pregnancy and childbirth, 4 million newborn babies die every year before they are 1 month old, 3 million are stillborn. The International Federation of Red Cross and Red Crescent Societies (IFRC) knows that the health of mothers and children play an integral part in the struggle to reduce poverty.

  //     Through its network of National Red Cross Red and Crescent Societies, the IFRC has been supporting and implementing health initiatives related to reproductive, maternal, newborn and child health for over 20 years. The IFRC is committed to “Making Every Mother and Child Count”, by working with partners to achieve Millennium Development Goals 4 and 5 to dramatically reduce child mortality and improve maternal health by 2015. As part of this strategy, the IFRC cooperates with the WHO, UNICEF and UNFPA and is part of an inter-agency working group to promote and facilitate reproductive health programmes.
  //     `,
  //     organisations
  //   },
  //   {
  //     title: 'First Aid',
  //     description: `The IFRC is one of the world’s leading first aid providers. First aid is a humanitarian act that should be accessible to all. With first aid skills volunteers and communities are empowered to save lives without discrimination.
  //     One hundred and fifty years ago, a battle in northern Italy sparked an idea that has since changed the world. On 24 June 1859, Henry Dunant, a young Geneva businessman, witnessed horrifying suffering and agony following the battle of Solferino. The need for humanitarian action is still as vital today as it was in 1859.

  //     Millions of people are hurt or killed by injuries every year due to inadequate response or lack of timely assistance. Taking immediate action and applying the appropriate techniques, while waiting for professional help, can considerably reduce deaths and injuries, and the impact of disasters and everyday emergencies. First aid is not a replacement for emergency services. It is a vital initial step for providing effective and swift action that helps to reduce serious injuries and improve the chances of survival.

  //     People living in war-torn or disaster-affected areas are often not given the opportunity to be trained in basic first aid. First aid awareness is lacking in many vulnerable communities, where a very basic idea of how to treat an injury or keep someone alive, would have real impact. We believe that first aid reduces vulnerabilities and helps build stronger communities.

  //     Have you completed the IFRC’s online first aid course looking at five of the most common causes of injuries in children and infants? Sign-up to the introductory course to learn key first aid skills for free
  //     `,
  //     organisations
  //   },
  //   {
  //     title: 'Voluntary blood donation',
  //     description: `Blood donation
  //     About 108 million blood donations are collected worldwide each year. Almost half of these are collected in high-income countries, home to 15 per cent of the world’s population. Although there has been an increase of almost 8 million blood donations from voluntary unpaid donors from 2004 to 2011, equitable access to safe blood still does not exist for many of those who need it.

  //     There are chronic shortages of safe blood and blood products in many countries, so blood transfusion is not available for many of the world’s most vulnerable populations.

  //     A system of regular and voluntary non-remunerated blood donation (VNRBD) is critical for high-quality blood service delivery. Promoting equity, access, quality and safety of blood and blood components is indispensable to achieve the Millennium Development Goals.

  //     Our approach
  //     The IFRC is uniquely placed to improve the safety and accessibility of blood supply. We have the largest humanitarian network of volunteers in the world and, therefore, considerable experience in keeping, motivating and supporting our volunteers. This knowledge is equally relevant for the retention of blood donors: we support global health security by promoting VNRBD and advocating for the safe provision of blood products and services.

  //     At the global level
  //     The IFRC has always been at the forefront of promoting VNRBD, at both advocacy and capacity-building levels. The long experience of National Red Cross and Red Crescent Societies in supplying blood and blood products meant that our voice was heard when we advocated for recognition of VNRBD on the global health agenda. In 1975, the World Health Assembly urged its member states to promote national voluntary and non-remunerated blood services. Another key milestone in our advocacy work, and that of three other founding partners, was the establishment in 2004 of World Blood Donor Day, a day that continues to be an occasion for reiterating the importance of VNRBD worldwide. In 2001, the IFRC established the Global Advisory Panel on Corporate Governance and Risk Management for Red Cross and Red Crescent Societies. This panel of experts is now available for countries requesting technical expertise in all aspects of risk management, as spelled out in the IFRC’s Blood Policy, which was adopted in 2011. In addition, the Global Framework for Action: Towards 100 per cent Voluntary Blood Donation, jointly developed with the World Health Organization, provides guidance and support to countries seeking to establish effective VNRBD programmes.

  //     At the national and community levels
  //     In many countries, National Red Cross and Red Crescent Societies, as auxiliaries to their governments, play an important role in promoting safe and sustainable blood programmes. National Society engagement in blood programmes in some cases means responsibility for blood collection and supply. About one-quarter of National Societies are responsible for blood service delivery in their national blood programmes, while around 63 per cent are engaged in systematic blood donor recruitment activities or advocacy for and promotion of VNRBD. Club 25 is one of many successful initiatives that National Societies support. Through this initiative, young donors provide blood to save lives and encourage other young people to do the same (see case study).

  //     Impact
  //     According to 2011 WHO data, 60 countries, including some with limited resources, have a blood supply based entirely on voluntary and nonremunerated blood donations. These donations have an impact on almost every aspect of modern medicine. With more than 34 million donations of blood given annually worldwide, the reach of Red Cross Red Crescent blood donors cannot be quantified. However, it is happening every minute of each day, 365 days a year, saving lives day in, day out with the gift of blood. The viability of a country’s blood service, however, rests with its government and its commitment to safer blood starts with enforcing a national blood policy based on the principle of 100 per cent voluntary blood donation.
  //     `,
  //     organisations
  //   }
  // ])

  // //organisations[1].projects = ifrcProjects

  // await projectRepository.save(ifrcProjects)
  // await projectRepository.save(icrcProjects)

  // await projectRepository.save(projects)

  // const recipes = recipeRepository.create([
  //   {
  //     title: 'Recipe 1',
  //     description: 'Desc 1',
  //     author: defaultUser,
  //     ratings: ratingsRepository.create([
  //       { value: 2, user: defaultUser },
  //       { value: 4, user: defaultUser },
  //       { value: 5, user: defaultUser },
  //       { value: 3, user: defaultUser },
  //       { value: 4, user: defaultUser }
  //     ])
  //   },
  //   {
  //     title: 'Recipe 2',
  //     author: defaultUser,
  //     ratings: ratingsRepository.create([
  //       { value: 2, user: defaultUser },
  //       { value: 4, user: defaultUser }
  //     ])
  //   }
  // ])
  // await recipeRepository.save(recipes)

  return {
    defaultUser: superAdminUser
  }
}

export function RelationColumn (options?: ColumnOptions) {
  return Column({ nullable: true, ...options })
}
