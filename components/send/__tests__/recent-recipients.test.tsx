import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { RecentRecipients, getStoredContacts, saveStoredContacts, Contact } from '../recent-recipients'

describe('RecentRecipients and Contact Storage', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
  })

  test('getStoredContacts seeds default recipients if localStorage is empty', () => {
    const contacts = getStoredContacts()
    expect(contacts.length).toBe(3)
    expect(contacts[0].name).toBe('Ava Thompson')
    expect(contacts[0].address).toBe('GBA4B7H...S7N8')
  })

  test('saveStoredContacts and getStoredContacts persist contacts correctly', () => {
    const testContacts: Contact[] = [
      { id: '1', address: 'G123', name: 'Alice', avatar: 'AL', createdAt: new Date().toISOString() },
    ]
    saveStoredContacts(testContacts)
    const loaded = getStoredContacts()
    expect(loaded).toEqual(testContacts)
  })

  test('RecentRecipients renders contacts and handles selection', () => {
    const handleSelect = jest.fn()
    render(<RecentRecipients onSelect={handleSelect} />)

    const recipientButton = screen.getByText('Ava Thompson')
    fireEvent.click(recipientButton)

    expect(handleSelect).toHaveBeenCalledWith('GBA4B7H...S7N8', 'Ava Thompson', 'AT')
  })

  test('RecentRecipients loads custom contacts from localStorage', () => {
    const customContacts: Contact[] = [
      { id: '2', address: 'GXYZ', name: 'Bob Smith', avatar: 'BS', createdAt: new Date().toISOString() },
    ]
    saveStoredContacts(customContacts)

    const handleSelect = jest.fn()
    render(<RecentRecipients onSelect={handleSelect} />)

    expect(screen.getByText('Bob Smith')).toBeInTheDocument()
    expect(screen.getByText('GXYZ')).toBeInTheDocument()
  })
})
