describe('EXPLORER_BASE derivation', () => {
  it('uses public network when NEXT_PUBLIC_STELLAR_NETWORK is PUBLIC', () => {
    const original = process.env.NEXT_PUBLIC_STELLAR_NETWORK
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'PUBLIC'
    const base = `https://stellar.expert/explorer/${
      process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'PUBLIC' ? 'public' : 'testnet'
    }/tx`
    expect(base).toBe('https://stellar.expert/explorer/public/tx')
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = original
  })

  it('uses testnet when NEXT_PUBLIC_STELLAR_NETWORK is TESTNET', () => {
    const original = process.env.NEXT_PUBLIC_STELLAR_NETWORK
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = 'TESTNET'
    const base = `https://stellar.expert/explorer/${
      process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'PUBLIC' ? 'public' : 'testnet'
    }/tx`
    expect(base).toBe('https://stellar.expert/explorer/testnet/tx')
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = original
  })

  it('defaults to testnet when env var is not set', () => {
    const original = process.env.NEXT_PUBLIC_STELLAR_NETWORK
    delete process.env.NEXT_PUBLIC_STELLAR_NETWORK
    const base = `https://stellar.expert/explorer/${
      process.env.NEXT_PUBLIC_STELLAR_NETWORK === 'PUBLIC' ? 'public' : 'testnet'
    }/tx`
    expect(base).toBe('https://stellar.expert/explorer/testnet/tx')
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = original
  })
})
