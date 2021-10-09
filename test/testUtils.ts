import { assert } from 'chai'

export const assertThrowsAsync = async (fn, errorMessage) => {
  let f = () => {
    // empty function
  }
  try {
    await fn()
  } catch (e) {
    f = () => {
      throw e
    }
  } finally {
    if (errorMessage) {
      assert.throw(f, errorMessage)
    } else {
      assert.throw(f)
    }
  }
}

export function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export const assertNotThrowsAsync = async fn => {
  let f = () => {
    // empty function
  }
  try {
    await fn()
  } catch (e) {
    f = () => {
      throw e
    }
  } finally {
    assert.doesNotThrow(f)
  }
}
