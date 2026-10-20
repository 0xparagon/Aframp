import { STELLAR_ASSETS } from '../assets'

describe('STELLAR_ASSETS', () => {
  it('lists XLM and USDC with display metadata', () => {
    expect(STELLAR_ASSETS.map((asset) => asset.code)).toEqual(['XLM', 'USDC'])
    for (const asset of STELLAR_ASSETS) {
      expect(asset.name).toBeTruthy()
      expect(asset.icon).toBeTruthy()
      expect(asset.color).toMatch(/^#[0-9A-F]{6}$/i)
    }
  })
})
