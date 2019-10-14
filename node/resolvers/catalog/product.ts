import { Functions } from '@gocommerce/utils'
import {
  compose,
  last,
  map,
  omit,
  prop,
  propOr,
  reject,
  reverse,
  split,
  toPairs,
} from 'ramda'

import { getBenefits } from '../benefits'
import { buildCategoryMap } from './utils'

type MaybeRecord = false | Record<string, any>
const objToNameValue = (
  keyName: string,
  valueName: string,
  record: Record<string, any>
) =>
  compose<Record<string, any>, [string, any][], MaybeRecord[], MaybeRecord>(
    reject<MaybeRecord>(value => typeof value === 'boolean' && value === false),
    map<[string, any], MaybeRecord>(
      ([key, value]) =>
        typeof value === 'string' && { [keyName]: key, [valueName]: value }
    ),
    toPairs
  )(record)

const knownNotPG = [
  'allSpecifications',
  'brand',
  'categoriesIds',
  'categoryId',
  'clusterHighlights',
  'productClusters',
  'items',
  'productId',
  'link',
  'linkText',
  'productReference',
]

const removeTrailingSlashes = (str: string) =>
  str.endsWith('/') ? str.slice(0, str.length - 1) : str

const removeStartingSlashes = (str: string) =>
  str.startsWith('/') ? str.slice(1) : str

const getLastCategory = compose<string, string, string[], string>(
  last,
  split('/'),
  removeTrailingSlashes
)

const treeStringToArray = compose(
  split('/'),
  removeTrailingSlashes,
  removeStartingSlashes
)

const productCategoriesToCategoryTree = async (
  { categories, categoriesIds, categoryId: prodCategoryId }: CatalogProduct,
  _: any,
  { clients: { catalog }, vtex: { account } }: Context
) => {
  if (!categories || !categoriesIds) {
    return []
  }
  const isVtex = !Functions.isGoCommerceAcc(account)
  const mainTree = categoriesIds.find(
    treeIdString => getLastCategory(treeIdString) === prodCategoryId
  )

  if (!mainTree) {
    return []
  }
  const mainTreeIds = treeStringToArray(mainTree)
  const reversedIds = reverse(mainTreeIds)

  if (isVtex) {
    return reversedIds.map(categoryId => catalog.category(Number(categoryId)))
  }
  const categoriesTree = await catalog.categories(reversedIds.length)
  const categoryMap = buildCategoryMap(categoriesTree)
  const mappedCategories = reversedIds
    .map(id => categoryMap[id])
    .filter(Boolean)

  return mappedCategories.length ? mappedCategories : null
}

export const resolvers = {
  Product: {
    benefits: ({ productId }: CatalogProduct, _: any, ctx: Context) =>
      getBenefits(productId, ctx),

    categoryTree: productCategoriesToCategoryTree,

    cacheId: ({ linkText }: CatalogProduct) => linkText,

    clusterHighlights: ({ clusterHighlights = {} }) =>
      objToNameValue('id', 'name', clusterHighlights),

    jsonSpecifications: (product: CatalogProduct) => {
      const { Specifications = [] } = product
      const specificationsMap = Specifications.reduce(
        (acc: Record<string, string>, key: string) => {
          acc[key] = (product as any)[key]
          return acc
        },
        {}
      )
      return JSON.stringify(specificationsMap)
    },

    productClusters: ({ productClusters = {} }: CatalogProduct) =>
      objToNameValue('id', 'name', productClusters),

    properties: (product: CatalogProduct) =>
      map(
        (name: string) => ({ name, values: (product as any)[name] }),
        product.allSpecifications || []
      ),

    propertyGroups: (product: CatalogProduct) => {
      const { allSpecifications = [] } = product
      const notPG = knownNotPG.concat(allSpecifications)
      return objToNameValue('name', 'values', omit(notPG, product))
    },

    recommendations: (product: CatalogProduct) => product,

    titleTag: prop('productTitle'),

    specificationGroups: (product: CatalogProduct) => {
      const allSpecificationsGroups = propOr<[], CatalogProduct, string[]>(
        [],
        'allSpecificationsGroups',
        product
      ).concat(['allSpecifications'])
      const specificationGroups = allSpecificationsGroups.map(
        (groupName: string) => ({
          name: groupName,
          specifications: ((product as any)[groupName] || []).map(
            (name: string) => ({
              name,
              values: (product as any)[name] || [],
            })
          ),
        })
      )
      return specificationGroups || []
    },
  },
  OnlyProduct: {
    categoryTree: productCategoriesToCategoryTree,
  },
}
