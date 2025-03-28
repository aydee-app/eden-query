/* c8 ignore start */

const kindOfCache = Object.create(null)

function kindOf(thing: unknown) {
  const str = toString.call(thing)
  return kindOfCache[str] || (kindOfCache[str] = str.slice(8, -1).toLowerCase())
}

/**
 * Determine if a value is a FormData
 *
 * @param {*} thing The value to test
 *
 * @returns {boolean} True if value is an FormData, otherwise false
 */
function isFormData(thing: unknown): thing is FormData {
  if (!thing) return false

  if (typeof FormData === 'function' && thing instanceof FormData) return true

  if (kindOf(thing) === 'formdata') return true

  if (typeof thing.toString === 'function' && thing.toString() === '[object FormData]') {
    return true
  }

  if (typeof thing === 'object' && 'append' in thing && typeof thing.append === 'function') {
    return true
  }

  return false
}

/**
 * It takes a string like `foo[x][y][z]` and returns an array like `['foo', 'x', 'y', 'z']
 *
 * @param name - The name of the property to get.
 *
 * @returns An array of strings.
 */
function parsePropPath(name: string) {
  // foo[x][y][z]
  // foo.x.y.z
  // foo-x-y-z
  // foo x y z
  return name
    .matchAll(/\w+|\[(\w*)]/g)
    .map((match) => {
      return match[0] === '[]' ? '' : match[1] || match[0]
    })
    .toArray()
}

/**
 * Convert an array to an object.
 *
 * @param arr - The array to convert to an object.
 *
 * @returns An object with the same keys and values as the array.
 */
function arrayToObject(arr: Array<any>) {
  const obj: any = {}

  for (const key of arr) {
    obj[key] = arr[key]
  }

  return obj
}

/**
 * It takes a FormData object and returns a JavaScript object
 *
 * @param formData The FormData object to convert to JSON.
 *
 * @returns The converted object.
 */
export function formDataToJSON(formData: string): Record<string, any> | null {
  function buildPath(path: string[], value: FormDataEntryValue, target: any, index: number) {
    let name: string | number | undefined = path[index++]

    if (name == null || name === '__proto__') return

    const isNumericKey = Number.isFinite(Number(name))

    const isLast = index >= path.length

    name = !name && Array.isArray(target) ? target.length : name

    if (name == null) return

    if (isLast) {
      if (Object.prototype.hasOwnProperty.call(target, name)) {
        target[name] = [target[name], value]
      } else {
        target[name] = value
      }

      return !isNumericKey
    }

    if (!target[name] || target[name] == null || typeof target[name] !== 'object') {
      target[name] = []
    }

    const result = buildPath(path, value, target[name], index)

    if (result && Array.isArray(target[name])) {
      target[name] = arrayToObject(target[name])
    }

    return !isNumericKey
  }

  if (isFormData(formData) && typeof formData.entries === 'function') {
    const obj = {}

    for (const entry of formData.entries()) {
      const path = parsePropPath(entry[0])
      buildPath(path, entry[1], obj, 0)
    }

    return obj
  }

  return null
}

export default formDataToJSON
/* c8 ignore end */
