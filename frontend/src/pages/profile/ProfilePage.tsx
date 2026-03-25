import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FaArrowRotateRight,
  FaCircleInfo,
  FaEarthAmericas,
  FaEnvelope,
  FaFloppyDisk,
  FaPenToSquare,
  FaShieldHalved,
  FaUser,
  FaXmark
} from 'react-icons/fa6'
import { getApiErrorMessage } from '../../api/apiClient'
import { authApi } from '../../api/auth'
import { usersApi } from '../../api/users'
import { useAuth } from '../../context/AuthContext'

type CountryCode = 'India' | 'UAE'

type ProfileRecord = {
  id: string
  name: string
  email: string
  role: string
  roleId: string
  country: CountryCode
}

type ProfileApiData = {
  id?: string
  email?: string
  fullName?: string
  name?: string
  role?: string
  roleId?: string
  country?: string
}

const mapProfileData = (
  profileData?: ProfileApiData | null
): ProfileRecord | null => {
  if (!profileData) return null
  const fallbackName = profileData.email?.split('@')[0] ?? ''
  return {
    id: profileData.id ?? '',
    name:
      profileData.fullName?.trim() || profileData.name?.trim() || fallbackName,
    email: profileData.email ?? '',
    role: profileData.role ?? '',
    roleId: profileData.roleId ?? '',
    country: parseCountry(profileData.country)
  }
}

const extractProfileRecord = (response: unknown): ProfileRecord | null => {
  const payload = (response as { data?: ProfileApiData })?.data ?? response
  return mapProfileData(payload as ProfileApiData | null | undefined)
}

const getDisplayName = (profile: ProfileRecord | null) => {
  return (profile?.name || 'User').trim() || 'User'
}

const getInitials = (name: string) => {
  const parts = name.split(' ').filter(Boolean)
  if (parts.length === 0) return 'U'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
}

const formatRoleLabel = (role?: string) => {
  if (!role) return 'Not assigned'
  return role
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

const parseCountry = (value?: string): CountryCode => {
  if (!value) return 'India'
  const normalized = value.trim().toLowerCase()
  return normalized === 'uae' ? 'UAE' : 'India'
}

const isValidEmail = (email: string) => /\S+@\S+\.\S+/.test(email)

const ProfilePage = () => {
  const { user, token, setAuthState, hasPermission } = useAuth()
  const [profile, setProfile] = useState<ProfileRecord | null>(null)
  const [draft, setDraft] = useState({ name: '', email: '' })
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(
    null
  )
  const [toast, setToast] = useState<{
    show: boolean
    message: string
    type: 'success' | 'error'
  }>({
    show: false,
    message: '',
    type: 'success'
  })
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const displayName = useMemo(() => getDisplayName(profile), [profile])
  const initials = useMemo(() => getInitials(displayName), [displayName])
  const roleLabel = formatRoleLabel(profile?.role)
  const emailLabel = profile?.email || 'Not available'
  const countryLabel = profile?.country ?? 'India'
  const canEditProfile = Boolean(user?.id) && hasPermission('users:update')

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type })
    setTimeout(
      () => setToast({ show: false, message: '', type: 'success' }),
      2400
    )
  }

  const fetchProfile = useCallback(async () => {
    setLoadingProfile(true)
    setProfileError('')
    try {
      const response = await authApi.profile()
      const nextProfile = extractProfileRecord(response)
      if (!nextProfile) {
        setProfile(null)
        setProfileError('Profile data is missing from the API response.')
        return null
      }
      setProfile(nextProfile)
      setDraft({
        name: nextProfile.name,
        email: nextProfile.email
      })
      return nextProfile
    } catch (err) {
      setProfile(null)
      setProfileError(getApiErrorMessage(err, 'Failed to load profile.'))
      return null
    } finally {
      setLoadingProfile(false)
    }
  }, [])

  useEffect(() => {
    void fetchProfile()
  }, [fetchProfile])

  const fields = [
    {
      label: 'Full Name',
      value: isEditing ? draft.name : displayName,
      icon: <FaUser className='text-slate-400' />,
      editable: true,
      key: 'name' as const
    },
    {
      label: 'Email',
      value: isEditing ? draft.email : emailLabel,
      icon: <FaEnvelope className='text-slate-400' />,
      editable: true,
      key: 'email' as const
    },
    {
      label: 'Role',
      value: roleLabel,
      icon: <FaShieldHalved className='text-slate-400' />
    },
    {
      label: 'Country',
      value: countryLabel,
      icon: <FaEarthAmericas className='text-slate-400' />
    }
  ]

  const handleCancel = () => {
    setDraft({
      name: profile?.name ?? '',
      email: profile?.email ?? ''
    })
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (!profile?.id) {
      showToast('Profile not loaded yet.', 'error')
      return
    }
    if (!canEditProfile) {
      showToast('You do not have permission to update this profile.', 'error')
      return
    }

    const nextName = draft.name.trim()
    const nextEmail = draft.email.trim()

    if (nextName.length < 2) {
      showToast('Full name must be at least 2 characters.', 'error')
      return
    }
    if (!isValidEmail(nextEmail)) {
      showToast('Please enter a valid email address.', 'error')
      return
    }

    setSaving(true)
    try {
      const response = await usersApi.update(profile.id, {
        fullName: nextName,
        email: nextEmail
      })

      const updatedProfile =
        extractProfileRecord(response) ?? (await fetchProfile()) ?? null

      if (!updatedProfile) {
        throw new Error('Updated profile response is empty.')
      }

      setProfile(updatedProfile)
      setDraft({
        name: updatedProfile.name,
        email: updatedProfile.email
      })
      setAuthState(token, {
        id: updatedProfile.id,
        name: updatedProfile.name,
        email: updatedProfile.email,
        role: updatedProfile.role,
        roleId: updatedProfile.roleId
      })
      setIsEditing(false)
      showToast('Profile updated successfully.', 'success')
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Unable to update profile.'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleProfileImageChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) return
    const nextUrl = URL.createObjectURL(file)
    setProfileImagePreview(nextUrl)
    showToast('Profile photo updated. Remember to save changes.', 'success')
  }

  useEffect(() => {
    return () => {
      if (profileImagePreview) URL.revokeObjectURL(profileImagePreview)
    }
  }, [profileImagePreview])

  return (
    <div className='mx-auto max-w-9xl space-y-6 px-0'>
      {toast.show ? (
        <div className='fixed left-1/2 top-4 z-50 -translate-x-1/2'>
          <div
            className={`rounded-xl border px-4 py-3 text-sm font-medium shadow-lg ${
              toast.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-800 dark:border-emerald-400/40 dark:bg-gray-900 dark:text-emerald-200'
                : 'border-red-200 bg-red-50 text-red-700 dark:border-red-400/40 dark:bg-gray-900 dark:text-red-200'
            }`}
          >
            {toast.message}
          </div>
        </div>
      ) : null}

      <div className='flex items-start justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
            Profile
          </h1>
          <p className='text-sm text-gray-500 dark:text-gray-400'>
            Account details loaded from the auth API
          </p>
        </div>

        <button
          onClick={() => void fetchProfile()}
          disabled={loadingProfile || saving}
          className='inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
        >
          <FaArrowRotateRight
            className={loadingProfile ? 'animate-spin' : ''}
          />
          Refresh
        </button>
      </div>

      {profileError ? (
        <div className='rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/30 dark:text-red-200'>
          {profileError}
        </div>
      ) : null}

      <div className='rounded-3xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900'>
        <div className='grid gap-8 lg:grid-cols-[360px,1fr]'>
          <div className='rounded-2xl border border-gray-100 bg-white p-6 shadow-inner dark:border-gray-800 dark:bg-gray-950'>
            <div className='flex flex-col items-center text-center'>
              <div className='relative'>
                <div className='relative flex h-48 w-48 items-center justify-center overflow-hidden rounded-[40px] bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-5xl font-semibold text-white shadow-xl'>
                  {profileImagePreview ? (
                    <img
                      src={profileImagePreview}
                      alt='Profile'
                      className='h-full w-full object-cover'
                    />
                  ) : (
                    <span>{initials}</span>
                  )}
                  <button
                    type='button'
                    onClick={() => fileInputRef.current?.click()}
                    className='absolute inset-x-6 bottom-5 rounded-2xl bg-white/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-blue-600 shadow hover:bg-white'
                  >
                    Upload Photo
                  </button>
                </div>
                <input
                  ref={fileInputRef}
                  type='file'
                  accept='image/*'
                  className='hidden'
                  onChange={handleProfileImageChange}
                />
              </div>

              <div className='mt-6 w-full space-y-4 text-left'>
                <div>
                  <p className='text-[11px] font-semibold uppercase tracking-widest text-gray-400'>
                    Official Email
                  </p>
                  <p className='mt-1 text-base font-medium text-gray-900 dark:text-gray-100'>
                    {emailLabel || 'admin@travel-crm.com'}
                  </p>
                </div>
                <div>
                  <p className='text-[11px] font-semibold uppercase tracking-widest text-gray-400'>
                    Role
                  </p>
                  <p className='mt-1 text-base font-medium text-gray-900 dark:text-gray-100'>
                    {roleLabel || 'Admin'}
                  </p>
                </div>
                <div>
                  <p className='text-[11px] font-semibold uppercase tracking-widest text-gray-400'>
                    Country
                  </p>
                  <p className='mt-1 text-base font-medium text-gray-900 dark:text-gray-100'>
                    {countryLabel}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className='flex flex-col gap-4'>
            <div className='flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gray-50 p-4 dark:bg-gray-950'>
              <div className='flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400'>
                <FaCircleInfo />
                <span>
                  {canEditProfile
                    ? 'Profile loads from /api/auth/me and saves through /api/users/:id.'
                    : 'Profile loads from /api/auth/me.'}
                </span>
              </div>

              {isEditing ? (
                <div className='flex items-center gap-2'>
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className='inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900'
                  >
                    <FaXmark />
                    Cancel
                  </button>
                  <button
                    onClick={() => void handleSave()}
                    disabled={saving}
                    className='inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60'
                  >
                    <FaFloppyDisk />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  disabled={!canEditProfile || loadingProfile}
                  className='inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-gray-900'
                >
                  <FaPenToSquare />
                  Edit
                </button>
              )}
            </div>

            <div className='flex items-center gap-2 rounded-2xl bg-gray-50 p-4 text-sm text-gray-600 dark:bg-gray-950 dark:text-gray-400'>
              <FaCircleInfo />
              <span>
                {canEditProfile
                  ? 'You can edit your full name and email here.'
                  : 'Profile editing requires users:update permission.'}
              </span>
            </div>

            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              {fields.map(field => (
                <div
                  key={field.label}
                  className={`rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950 ${
                    field.label === 'User ID' ? 'md:col-span-2' : ''
                  }`}
                >
                  <div className='mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400'>
                    {field.icon}
                    {field.label}
                  </div>
                  {isEditing && field.editable ? (
                    <input
                      className='field-input'
                      value={field.value}
                      onChange={event =>
                        setDraft(current => ({
                          ...current,
                          [field.key]: event.target.value
                        }))
                      }
                    />
                  ) : (
                    <p className='break-all text-sm font-medium text-gray-900 dark:text-gray-100'>
                      {field.value}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfilePage
