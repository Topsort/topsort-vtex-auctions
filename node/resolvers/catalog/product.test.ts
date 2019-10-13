import { resolvers } from './product'
import { mockContext } from '../../__mocks__/helpers'
import { getProduct } from '../../__mocks__/product'

describe('tests related to product resolver', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockContext.vtex.account = 'storecomponents'
  })
  describe('categoryTree resolver', () => {
    test('ensure that VTEX account never calls the category tree catalog API', async () => {
      const catalogProduct = getProduct()
      await resolvers.Product.categoryTree(
        catalogProduct as any,
        {},
        mockContext as any
      )
      expect(mockContext.clients.catalog.category).toBeCalledTimes(2)
      expect(mockContext.clients.catalog.categories).toBeCalledTimes(0)
    })

    test('get correct main category tree for product with only one tree', async () => {
      const catalogProduct = getProduct()
      // mockContext.clients.catalog.category.
      await resolvers.Product.categoryTree(
        catalogProduct as any,
        {},
        mockContext as any
      )
      expect(mockContext.clients.catalog.category).toBeCalledTimes(2)
      expect(mockContext.clients.catalog.category.mock.calls[0][0]).toBe(10)
      expect(mockContext.clients.catalog.category.mock.calls[1][0]).toBe(25)
    })

    test('get correct main category tree for product with more than one tree', async () => {
      const categoriesIds = [
        '/101/101003/101003009/',
        '/101/101003/',
        '/101/',
        '/101/101019/101019004/',
        '/101/101019/',
        '/103/103023/103023003/',
        '/103/103023/',
        '/103/',
      ]
      const catalogProduct = getProduct({
        categoriesIds,
        categoryId: '101003009',
      })

      await resolvers.Product.categoryTree(
        catalogProduct as any,
        {},
        mockContext as any
      )
      expect(mockContext.clients.catalog.category).toBeCalledTimes(3)
      expect(mockContext.clients.catalog.category.mock.calls[0][0]).toBe(
        101003009
      )
      expect(mockContext.clients.catalog.category.mock.calls[1][0]).toBe(101003)
      expect(mockContext.clients.catalog.category.mock.calls[2][0]).toBe(101)
    })

    test('ensure that GC account calls the category tree API ', async () => {
      const catalogProduct = getProduct()
      mockContext.vtex.account = 'gc-lea121'
      mockContext.clients.catalog.categories.mockImplementation(() => [
        {
          id: '10',
          name: 'a',
          url: 'a',
          children: [],
        },
        {
          id: '25',
          name: 'a',
          url: 'a',
          children: [],
        },
      ])
      const result = await resolvers.Product.categoryTree(
        catalogProduct as any,
        {},
        mockContext as any
      )
      expect(mockContext.clients.catalog.category).toBeCalledTimes(0)
      expect(mockContext.clients.catalog.categories).toBeCalledTimes(1)
      expect(mockContext.clients.catalog.categories.mock.calls[0][0]).toBe(2) //ensure maximum level was correct
      expect(result!.length).toBe(2)
    })
  })
})
