import { Fragment, useState } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/20/solid';
import { UserStatus } from '../services/websocket';
import { useUserPresence } from '../hooks/useUserPresence';

const statusOptions = [
  { value: UserStatus.ACTIVE, label: 'Active', color: 'bg-green-500' },
  { value: UserStatus.AWAY, label: 'Away', color: 'bg-yellow-500' },
  { value: UserStatus.BUSY, label: 'Busy', color: 'bg-red-500' },
  { value: UserStatus.OFFLINE, label: 'Offline', color: 'bg-gray-500' },
];

export default function UserStatusSelector() {
  const { myStatus, updateMyStatus } = useUserPresence();
  const [customMessage, setCustomMessage] = useState('');
  const [showMessageInput, setShowMessageInput] = useState(false);

  const currentStatus = statusOptions.find(s => s.value === myStatus) || statusOptions[0];

  const handleStatusChange = (status: UserStatus) => {
    if (status === myStatus) {
      setShowMessageInput(!showMessageInput);
    } else {
      updateMyStatus(status, customMessage);
      setShowMessageInput(false);
    }
  };

  const handleMessageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMyStatus(myStatus, customMessage);
    setShowMessageInput(false);
  };

  return (
    <div className="relative">
      <Menu as="div" className="relative inline-block text-left">
        <div>
          <Menu.Button className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
            <div className={`h-2 w-2 rounded-full ${currentStatus.color} mr-2`} />
            <span>{currentStatus.label}</span>
            {customMessage && (
              <span className="ml-2 text-xs text-gray-500">({customMessage})</span>
            )}
            <ChevronDownIcon className="ml-2 -mr-1 h-4 w-4" aria-hidden="true" />
          </Menu.Button>
        </div>

        <Transition
          as={Fragment}
          enter="transition ease-out duration-100"
          enterFrom="transform opacity-0 scale-95"
          enterTo="transform opacity-100 scale-100"
          leave="transition ease-in duration-75"
          leaveFrom="transform opacity-100 scale-100"
          leaveTo="transform opacity-0 scale-95"
        >
          <Menu.Items className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
            <div className="py-1">
              {statusOptions.map((option) => (
                <Menu.Item key={option.value}>
                  {({ active }) => (
                    <button
                      onClick={() => handleStatusChange(option.value)}
                      className={`${
                        active ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                      } group flex w-full items-center px-4 py-2 text-sm`}
                    >
                      <div className={`h-2 w-2 rounded-full ${option.color} mr-3`} />
                      {option.label}
                    </button>
                  )}
                </Menu.Item>
              ))}
            </div>
          </Menu.Items>
        </Transition>
      </Menu>

      {showMessageInput && (
        <form onSubmit={handleMessageSubmit} className="absolute top-full mt-2 right-0 z-20">
          <div className="bg-white rounded-md shadow-lg p-3 border border-gray-200">
            <input
              type="text"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Custom status message..."
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              autoFocus
            />
            <div className="mt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowMessageInput(false)}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Set
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}