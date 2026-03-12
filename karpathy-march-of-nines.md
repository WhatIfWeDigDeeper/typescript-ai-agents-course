# [Andrej Karpathy March of Nines](https://venturebeat.com/technology/karpathys-march-of-nines-shows-why-90-ai-reliability-isnt-even-close-to)

```python
def run_step(name, attempt_fn, validate_fn, *, max_attempts=3, timeout_s=15):

    # trace all retries under one span

    span = start_span(name)

    for attempt in range(1, max_attempts + 1):

        try:

            # bound latency so one step can’t stall the workflow

            with deadline(timeout_s):

                out = attempt_fn()


# gate: schema + semantic + business invariants

            validate_fn(out)

            # success path

            metric("step_success", name, attempt=attempt)

            return out

        except (TimeoutError, UpstreamError) as e:

            # transient: retry with jitter to avoid retry storms

            span.log({"attempt": attempt, "err": str(e)})

            sleep(jittered_backoff(attempt))

        except ValidationError as e:

            # bad output: retry once in “safer” mode (lower temp / stricter prompt)

            span.log({"attempt": attempt, "err": str(e)})

            out = attempt_fn(mode="safer")

    # fallback: keep system safe when retries are exhausted

    metric("step_fallback", name)

    return EscalateToHuman(reason=f"{name} failed")
```
