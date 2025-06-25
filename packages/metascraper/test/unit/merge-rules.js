'use strict'

const test = require('ava')

test("add a new rule from a prop that doesn't exist", async t => {
  const url = 'https://microlink.io'

  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Document</title>
  </head>
  <body>
    <div class="logos">
      <img class="logo" href="https://microlink.io/logo.png">
      <img class="logo" href="https://microlink.io/logo.png">
      <img class="logo" href="https://microlink.io/logo.png">
      <img class="logo" href="https://microlink.io/logo.png">
    </div>

    <img class="main-logo" href="https://microlink.io/logo.png">
    <p>Hello World </p>
  </body>
  </html>
  `

  const rules = [
    {
      foo: [() => 'bar']
    }
  ]

  const metascraper = require('../..')([])
  const metadata = await metascraper({ url, html, rules })

  t.is(metadata.foo, 'bar')
})

test('add a new rule for a prop that exists', async t => {
  const url = 'https://microlink.io'

  const html = `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <meta property="og:image" content="http://ia.media-imdb.com/images/rock.jpg" />
    <title>Document</title>
  </head>
  <body>
    <img id="logo" src="https://microlink.io/logo.png">
    <p>Hello World </p>
  </body>
  </html>
  `

  const rules = [
    {
      image: [({ htmlDom: $ }) => $('#logo').attr('src')]
    }
  ]

  const metascraper = require('../..')([require('metascraper-image')()])

  const metadata = await metascraper({ url, html, rules })
  t.is(metadata.image, 'https://microlink.io/logo.png')
})

test('does not mutate original rule objects', t => {
  const { mergeRules } = require('../../src/rules')

  // Create original rule objects that we'll check for mutation
  const originalRule1 = { fn: () => 'value1', originalProp: 'unchanged' }
  const originalRule2 = { fn: () => 'value2', originalProp: 'unchanged' }

  // Base rules with references to original rule objects
  const baseRules = [
    ['prop1', [originalRule1]],
    ['prop2', [originalRule2]]
  ]

  // Inline rules with a test property that would cause mutation
  const inlineRules = [
    {
      test: url => url.includes('example'),
      prop1: [() => 'new value'],
      prop3: [() => 'another value']
    }
  ]

  // Store original state for comparison
  const originalRule1Copy = { ...originalRule1 }
  const originalRule2Copy = { ...originalRule2 }

  // Call mergeRules - this should not mutate the original rule objects
  mergeRules(inlineRules, baseRules)

  // Verify original rule objects are not mutated
  t.deepEqual(
    originalRule1,
    originalRule1Copy,
    'originalRule1 should not be mutated'
  )
  t.deepEqual(
    originalRule2,
    originalRule2Copy,
    'originalRule2 should not be mutated'
  )

  // Verify original rules don't have the test property added
  t.is(
    originalRule1.test,
    undefined,
    'originalRule1 should not have test property'
  )
  t.is(
    originalRule2.test,
    undefined,
    'originalRule2 should not have test property'
  )
})

test('baseRules array should not be mutated (fails without cloneDeep)', t => {
  const { mergeRules } = require('../../src/rules')

  // Create original baseRules array
  const originalBaseRules = [
    ['title', [() => 'original title']],
    ['description', [() => 'original description']]
  ]

  // Store original length and structure for comparison
  const originalLength = originalBaseRules.length
  const originalKeys = originalBaseRules.map(([key]) => key)
  const originalTitleRulesLength = originalBaseRules[0][1].length

  // Inline rules that will add new properties and merge with existing ones
  const inlineRules = [
    {
      title: [() => 'new title'], // This will merge with existing title
      author: [() => 'new author'], // This will add a new property
      test: url => url.includes('test') // This adds a test property
    }
  ]

  // Call mergeRules - this should NOT mutate originalBaseRules
  const result = mergeRules(inlineRules, originalBaseRules)

  // Verify the original baseRules array structure was not mutated
  t.is(
    originalBaseRules.length,
    originalLength,
    'Original baseRules length should not change'
  )
  t.deepEqual(
    originalBaseRules.map(([key]) => key),
    originalKeys,
    'Original baseRules keys should not change'
  )
  t.is(
    originalBaseRules[0][1].length,
    originalTitleRulesLength,
    'Original title rules array should not be modified'
  )

  // Verify the result is different from the original (proving it's a new array)
  t.not(
    result,
    originalBaseRules,
    'Result should be a different array reference'
  )

  // Verify the result contains the expected merged rules
  t.true(
    result.length >= originalLength,
    'Result should contain at least the original rules'
  )

  // Find the title rule in the result and verify it was merged
  const titleRule = result.find(([propName]) => propName === 'title')
  t.truthy(titleRule, 'Title rule should exist in result')
  t.true(
    titleRule[1].length > originalTitleRulesLength,
    'Title rule should have more rules after merging'
  )
})
