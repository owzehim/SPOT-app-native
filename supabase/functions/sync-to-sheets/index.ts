import { serve } from 'https://deno.land/x/sift@0.6.0/mod.ts'

serve(async (req) => {
  try {
    const payload = await req.json()
    const record = payload.record

    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwejyk76fjur-mM34s1_mIJutd5CwtHTXgxNoRUSKa37il0xU4aPZp-gGyvfSDTRcRc/exec'

    const params = new URLSearchParams({
      date: record.date,
      time: record.time,
      fullName: record.full_name,
      university: record.university,
      studentId: record.student_id,
      major: record.major,
      year: record.year,
      membershipValidUntil: record.membership_valid_until,
      storeId: record.store_id,
    })

    await fetch(`${SCRIPT_URL}?${params.toString()}`)

    return new Response(JSON.stringify({ success: true }), { status: 200 })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})