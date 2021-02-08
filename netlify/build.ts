import config from '../config';
import axios from 'axios'
import Logger from '../logger'

const deployHook = config.get('NETLIFY_DEPLOY_HOOK')
const environment = config.get('ENVIRONMENT')

const netlifyUrl = `https://api.netlify.com/build_hooks/${deployHook}`

export async function triggerBuild () {

  try { 
    if(deployHook && (environment === 'staging' || environment === 'production')) {
    // test local: if(deployHook) {
      const response: any = await axios.post(netlifyUrl, {})
  
      // console.log(`response.data ---> : ${response.data}`)
      // console.log(`response.status ---> : ${response.status}`)
    
    }
    
  } catch(e) {
    Logger.captureException(e);
    console.error(`Error while triggering rebuild`, e)
  }
  
}
