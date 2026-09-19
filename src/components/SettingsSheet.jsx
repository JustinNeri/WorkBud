import { useRef, useState } from 'react'
import {
  Camera,
  KeyRound,
  LogOut,
  ShieldCheck,
  Trash2,
  UserRound,
  Wallet,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
  MAX_PICK_BYTES,
  avatarUrl,
  removeAvatar,
  uploadAvatar,
} from '../lib/avatar'
import { CURRENCIES, OCCUPATIONS } from '../lib/format'
import { Avatar } from './Avatar'
import { Sheet } from './Sheet'
import { Alert, Button, Field, FormSection, NumberInput, Select, TextInput } from './ui'

const FORM_ID = 'wb-settings-form'

/** Account-level settings. Hour and budget targets live on each job instead. */
export function SettingsSheet({
  open,
  userId,
  profile,
  email,
  onClose,
  onSave,
  onChangePassword,
}) {
  const [firstName, setFirstName] = useState(profile?.first_name ?? '')
  const [lastName, setLastName] = useState(profile?.last_name ?? '')
  const [middleInitial, setMiddleInitial] = useState(profile?.middle_initial ?? '')
  const [age, setAge] = useState(profile?.age != null ? String(profile.age) : '')
  const [occupation, setOccupation] = useState(profile?.occupation ?? OCCUPATIONS[0])
  const [currency, setCurrency] = useState(profile?.currency ?? 'PHP')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const fileRef = useRef(null)
  const [avatarPath, setAvatarPath] = useState(profile?.avatar_path ?? null)
  const [avatarBusy, setAvatarBusy] = useState(false)

  const initial = (firstName.trim()[0] || email?.[0] || '?').toUpperCase()

  /**
   * Picking a file uploads it immediately and repoints the profile at it.
   *
   * Order matters on both ends. The new file goes up before the row is
   * changed, and the old file is deleted only once the row has been changed —
   * so at no point does the profile refer to something that isn't there. If
   * the row update fails, the just-uploaded file is the orphan, and it gets
   * taken back out rather than left behind.
   */
  async function handlePick(e) {
    const file = e.target.files?.[0]
    // Clear the input, or picking the same file again after a failure is not
    // a change and fires no event.
    e.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/'))
      return setError('That file is not an image.')
    if (file.size > MAX_PICK_BYTES)
      return setError('That image is too large — pick one under 12 MB.')

    setAvatarBusy(true)
    setError(null)

    const previous = avatarPath
    const { path, error: upErr } = await uploadAvatar(userId, file)
    if (upErr) {
      setError(upErr)
      setAvatarBusy(false)
      return
    }

    const { error: saveErr } = await onSave({ avatar_path: path })
    if (saveErr) {
      removeAvatar(path)
      setError(saveErr)
      setAvatarBusy(false)
      return
    }

    setAvatarPath(path)
    setAvatarBusy(false)
    // Best-effort: the profile already points elsewhere, so a file left
    // behind is invisible rather than broken.
    if (previous) removeAvatar(previous)
  }

  async function handleRemove() {
    setAvatarBusy(true)
    setError(null)

    const previous = avatarPath
    const { error: err } = await onSave({ avatar_path: null })
    if (err) {
      setError(err)
      setAvatarBusy(false)
      return
    }

    setAvatarPath(null)
    setAvatarBusy(false)
    if (previous) removeAvatar(previous)
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!firstName.trim() || !lastName.trim())
      return setError('First and last name are required.')

    const ageValue = Number(age)
    if (age !== '' && (!Number.isInteger(ageValue) || ageValue < 10 || ageValue > 120))
      return setError('Enter a real age, or leave it blank.')

    setBusy(true)
    setError(null)

    const { error: err } = await onSave({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      middle_initial: middleInitial.trim() || null,
      age: age === '' ? null : ageValue,
      occupation,
      currency,
    })

    if (err) {
      setError(err)
      setBusy(false)
      return
    }
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Settings"
      footer={
        <>
          <Alert>{error}</Alert>
          {/* Outside <form>, so the form attribute is what still submits it. */}
          <Button
            type="submit"
            form={FORM_ID}
            busy={busy}
            className={error ? 'mt-2' : ''}
          >
            Save changes
          </Button>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Uploaded the moment it is picked rather than on Save: the whole
            point of choosing a picture is seeing it, and holding it back
            until the form is submitted means staring at a spinner instead.
            The file input is visually hidden because a native one cannot be
            styled to sit with the rest of these buttons. */}
        <FormSection label="Photo" icon={Camera} tone="brand" first>
          <div className="flex items-center gap-4">
            <Avatar src={avatarUrl(avatarPath)} initial={initial} size={72} />

            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handlePick}
                className="sr-only"
              />
              <Button
                type="button"
                variant="secondary"
                busy={avatarBusy}
                onClick={() => fileRef.current?.click()}
              >
                <Camera size={16} />
                {avatarPath ? 'Change photo' : 'Upload photo'}
              </Button>
              {avatarPath && !avatarBusy ? (
                <Button type="button" variant="dangerGhost" onClick={handleRemove}>
                  <Trash2 size={15} />
                  Remove
                </Button>
              ) : null}
            </div>
          </div>

          <p className="mt-2.5 text-xs leading-snug text-faint">
            Cropped square and resized to 512px on your own device before it is
            sent, so a photo straight off the camera costs a few KB of data
            rather than a few MB.
          </p>
        </FormSection>

        <FormSection label="About you" icon={UserRound} tone="brand">
          <div className="flex flex-col gap-3">
            {/* The M.I. width lives on the grid track: `w-16` on the input
                loses to `w-full` from the shared field style, since Tailwind's
                sort order decides between two rules for the same property. */}
            <div className="grid grid-cols-[1fr_5rem] gap-3">
              <Field label="First name">
                <TextInput
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                  required
                />
              </Field>
              <Field label="M.I.">
                <TextInput
                  value={middleInitial}
                  onChange={(e) => setMiddleInitial(e.target.value)}
                  maxLength={4}
                  className="text-center"
                />
              </Field>
            </div>

            <div className="grid grid-cols-[1fr_5rem] gap-3">
              <Field label="Last name">
                <TextInput
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                  required
                />
              </Field>
              <Field label="Age">
                <NumberInput
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  min="10"
                  max="120"
                  step="1"
                  className="text-center"
                />
              </Field>
            </div>

            <Field label="What do you do?">
              <Select
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
              >
                {OCCUPATIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </FormSection>

        <FormSection label="Money" icon={Wallet} tone="money">
          <Field label="Currency" hint="Applies everywhere money is shown.">
          <Select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} — {c.label} ({c.code})
              </option>
            ))}
          </Select>
          </Field>
        </FormSection>

        <FormSection label="Account" icon={ShieldCheck}>
          <p className="mb-3 text-[13px] leading-snug break-words text-muted">
            Signed in as <span className="font-medium text-ink">{email}</span>
          </p>
          <div className="flex flex-col gap-2">
            <Button type="button" variant="secondary" onClick={onChangePassword}>
              <KeyRound size={17} />
              Change password
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => supabase.auth.signOut()}
            >
              <LogOut size={17} />
              Sign out
            </Button>
          </div>
        </FormSection>
      </form>
    </Sheet>
  )
}
