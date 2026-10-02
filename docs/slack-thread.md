# Originating Slack thread

> Captured verbatim for the record. Dates relative to kickoff (Sep/Oct 2026).

**Nidhi Gupta** — 5:28 PM
Hi Jason, We can discuss this further on Monday, as may be late Friday evening for you.
I am working on an Strategic initiative on S3 Tables adoption. As part of that, wanted to
check if DynaTrace has integration done with S3 Tables, and where we are with that.

**Jason Mimick** — 6:04 PM
Hi Nidhi - sure thanks. I will check in with them and let you know - they have not
mentioned that recently but will let you know

**Nidhi Gupta** — 6:29 PM
Thank you Jason!

**Jason Mimick** — 10:09 AM
Hi @nidhigva - following up on this - Dynatrace has some 'basic' support for discovery and
metrics around S3 Tables but not yet a deep integration with like schema discovery yet.
I'm trying to get connected to PMs who own that - Are there some new things coming? We can
propose some better/new integrations?

**Nidhi Gupta** — 2:24 PM
Thanks @mimjasov. So looks like Dynatrace is already integrated. Can you help me get the
details on the pattern they used for this integration first. Per the initiative, I can
help with build, and if Build already there, then we can help with GTM.

**Nidhi Gupta** — 2:25 PM
here are few of the patterns:
- Connect to S3 Tables via S3 Table IRC endpoint
- Connect to S3 Tables via Glue IRC endpoint
- ISV Solution Build on S3 Tables bucket

**Nidhi Gupta** — 2:26 PM
once you share the integration pattern they have used, we can help with GTM on that, or
propose other integration patterns that could be applicable to them.

**Srinivas Kesanapally** — 2:30 PM
here are the different metrics datadog is collecting.
https://docs.datadoghq.com/integrations/amazon-s3-tables/

**Srinivas Kesanapally** — 2:32 PM
they most likely used pattern 1.

**Srinivas Kesanapally** — 2:33 PM
let's work on a blog post on this integration and surface all the data points dynatrace
make visibile to customers. Michael Stephan is the PM we need to reach out to
