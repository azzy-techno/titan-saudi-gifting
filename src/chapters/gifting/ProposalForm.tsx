'use client'

import { useEffect, useId, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod/mini'
import type { Dictionary } from '@/i18n'
import type { Locale } from '@/lib/i18n/config'
import { localizeDigits } from '@/lib/i18n/numerals'
import { useExperience } from '@/lib/store'
import { crownClick } from '@/lib/audio'
import { submitLead, type LeadResult } from '@/lib/lead'
import en from '@/i18n/en-options'
import s from './gifting.module.css'

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function makeSchema(e: Dictionary['form']['errors']) {
  return z.object({
    company: z.string().check(z.trim(), z.minLength(2, { error: e.required }), z.maxLength(120)),
    name: z.string().check(z.trim(), z.minLength(2, { error: e.required }), z.maxLength(80)),
    role: z.string().check(z.trim(), z.maxLength(80)),
    email: z.email({ error: e.email }),
    phone: z.string().check(
      z.refine((v) => v.replace(/[\s-]/g, '') === '' || /^5\d{8}$/.test(v.replace(/[\s-]/g, '')), { error: e.phone }),
    ),
    quantity: z.string().check(z.minLength(1, { error: e.required })),
    occasion: z.string().check(z.minLength(1, { error: e.required })),
    date: z.string().check(z.refine((v) => v === '' || v >= today(), { error: e.date })),
    engraving: z.string().check(z.maxLength(60)),
    message: z.string().check(z.maxLength(1500)),
    consent: z.boolean().check(z.refine((v) => v === true, { error: e.consent })),
    website: z.string(),
  })
}

type FormValues = z.infer<ReturnType<typeof makeSchema>>

export function ProposalForm({ locale, t }: { locale: Locale; t: Dictionary['form'] }) {
  const id = useId()
  const schema = useMemo(() => makeSchema(t.errors), [t.errors])
  const engraving = useExperience((st) => st.engraving)
  const engravingDefault = useExperience((st) => st.engravingDefault)
  const [result, setResult] = useState<LeadResult | null>(null)
  const [throttled, setThrottled] = useState(false)
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      company: '',
      name: '',
      role: '',
      email: '',
      phone: '',
      quantity: '',
      occasion: '',
      date: '',
      engraving: '',
      message: '',
      consent: false,
      website: '',
    },
    mode: 'onTouched',
  })

  // The engraving typed in the configurator flows into the request
  useEffect(() => {
    setValue('engraving', engraving.replace('\n', ' / '))
  }, [engraving, setValue])

  const onSubmit = async (v: FormValues) => {
    setThrottled(false)
    crownClick(0.7)
    const res = await submitLead({
      kind: 'proposal',
      locale,
      ...v,
      // canonical English option values for the CRM, whatever the page language
      quantity: en.quantity[t.quantityOptions.indexOf(v.quantity)] ?? v.quantity,
      occasion: en.occasion[t.occasionOptions.indexOf(v.occasion)] ?? v.occasion,
    })
    if (res.throttled) {
      setThrottled(true)
      return
    }
    setResult(res)
  }

  const err = (k: keyof FormValues) => errors[k]?.message
  const field = (k: keyof FormValues) => ({
    id: `${id}-${k}`,
    'aria-invalid': errors[k] ? true : undefined,
    'aria-describedby': errors[k] ? `${id}-${k}-err` : undefined,
  })

  if (result) {
    return (
      <div className={s.success} role="status" aria-live="polite" tabIndex={-1} ref={(el) => el?.focus()}>
        <p className="label">{t.success.ref} · <span className="digits">{result.ref}</span></p>
        <h3 className={`display ${s.successTitle}`}>{t.success.title}</h3>
        <p className={s.successBody}>{result.mode === 'mailto' ? t.success.mailto : t.success.body}</p>
        <p className="label">{t.success.next}</p>
        <ol className={s.successSteps}>
          {t.success.steps.map((st, i) => (
            <li key={st}>
              <span className="digits">{localizeDigits(String(i + 1).padStart(2, '0'), locale)}</span>
              {st}
            </li>
          ))}
        </ol>
        <button
          type="button"
          className={s.ghost}
          onClick={() => {
            reset()
            setResult(null)
          }}
        >
          {t.success.again}
        </button>
      </div>
    )
  }

  return (
    <form className={s.form} noValidate onSubmit={handleSubmit(onSubmit)} aria-labelledby="proposal-title">
      <div className={s.formGrid}>
        <Field label={t.company} error={err('company')} errId={`${id}-company-err`} htmlFor={`${id}-company`} wide>
          <input {...field('company')} {...register('company')} autoComplete="organization" className={s.input} />
        </Field>
        <Field label={t.name} error={err('name')} errId={`${id}-name-err`} htmlFor={`${id}-name`}>
          <input {...field('name')} {...register('name')} autoComplete="name" className={s.input} />
        </Field>
        <Field label={`${t.role} (${t.optional})`} error={err('role')} errId={`${id}-role-err`} htmlFor={`${id}-role`}>
          <input {...field('role')} {...register('role')} autoComplete="organization-title" className={s.input} />
        </Field>
        <Field label={t.email} error={err('email')} errId={`${id}-email-err`} htmlFor={`${id}-email`}>
          <input {...field('email')} {...register('email')} type="email" autoComplete="email" inputMode="email" dir="ltr" className={s.input} />
        </Field>
        <Field label={`${t.phone} (${t.optional})`} error={err('phone')} errId={`${id}-phone-err`} htmlFor={`${id}-phone`}>
          <div className={s.phone} dir="ltr">
            <span className={s.prefix}>{t.phonePrefix}</span>
            <input {...field('phone')} {...register('phone')} type="tel" autoComplete="tel-national" inputMode="tel" placeholder="5X XXX XXXX" className={s.input} />
          </div>
        </Field>
        <Field label={t.quantity} error={err('quantity')} errId={`${id}-quantity-err`} htmlFor={`${id}-quantity`}>
          <select {...field('quantity')} {...register('quantity')} className={s.input}>
            <option value="">{t.select}</option>
            {t.quantityOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t.occasion} error={err('occasion')} errId={`${id}-occasion-err`} htmlFor={`${id}-occasion`}>
          <select {...field('occasion')} {...register('occasion')} className={s.input}>
            <option value="">{t.select}</option>
            {t.occasionOptions.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </Field>
        <Field label={`${t.date} (${t.optional})`} error={err('date')} errId={`${id}-date-err`} htmlFor={`${id}-date`}>
          <input {...field('date')} {...register('date')} type="date" min={today()} className={s.input} />
        </Field>
        <div className={s.field} data-wide="true">
          <p className={s.fieldLabel} id={`${id}-engraving`}>
            {t.engraving}
          </p>
          <p className={s.engravingSummary} aria-labelledby={`${id}-engraving`}>
            {engraving.trim() ? (
              <span dir="auto" className={s.engravingValue}>
                {engraving.replace('\n', ' / ')}
              </span>
            ) : (
              // the caseback shows a sample until the visitor types; the request carries no engraving yet
              <span className={s.engravingSample}>
                <span className={s.sampleTag}>{t.engravingSample}</span>
                <span dir="auto" className={s.engravingValue} data-sample="true">
                  {engravingDefault.replace('\n', ' / ')}
                </span>
              </span>
            )}
            <a href="#configurator" className={s.edit}>
              {engraving.trim() ? t.engravingEdit : t.engravingTypeOwn}
            </a>
          </p>
        </div>
        <Field label={`${t.message} (${t.optional})`} error={err('message')} errId={`${id}-message-err`} htmlFor={`${id}-message`} wide>
          <textarea {...field('message')} {...register('message')} rows={4} dir="auto" className={s.input} />
        </Field>
        {/* honeypot — hidden from people and assistive tech */}
        <div className={s.hp} aria-hidden="true">
          <label htmlFor={`${id}-website`}>Website</label>
          <input id={`${id}-website`} tabIndex={-1} autoComplete="off" {...register('website')} />
        </div>
        <div className={s.consent}>
          <input {...field('consent')} {...register('consent')} type="checkbox" className={s.checkbox} />
          <label htmlFor={`${id}-consent`}>
            {t.consent} <span className={s.privacy}>{t.privacy}</span>
          </label>
          {err('consent') ? (
            <p id={`${id}-consent-err`} className={s.error} role="alert">
              {err('consent')}
            </p>
          ) : null}
        </div>
      </div>
      <div className={s.submitRow}>
        <button type="submit" className={s.submit} disabled={isSubmitting}>
          {isSubmitting ? t.sending : t.submit}
        </button>
        {throttled ? (
          <p className={s.error} role="alert">
            {t.errors.rate}
          </p>
        ) : null}
      </div>
    </form>
  )
}

function Field({
  label,
  error,
  errId,
  htmlFor,
  wide,
  children,
}: {
  label: string
  error?: string
  errId: string
  htmlFor: string
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={s.field} data-wide={wide ? 'true' : undefined}>
      <label className={s.fieldLabel} htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? (
        <p id={errId} className={s.error} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
