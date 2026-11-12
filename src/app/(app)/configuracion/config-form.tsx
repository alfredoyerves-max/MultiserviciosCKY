"use client";

import { useActionState, useState } from "react";
import { saveSystemConfigAction, type ConfigActionState } from "./actions";
import { ProteccionBadge, UnlockModal } from "./fiscal-lock";
import { CuentasBancariasPanel } from "./cuentas-bancarias-panel";
import { Field, FieldError, FieldLabel, Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import type { CuentaBancaria, SystemConfig } from "@/generated/prisma/client";
import type { CeavBandaInput } from "@/lib/costEngine";
import {
  IMSS_ENF_MAT_CUOTA_FIJA_PCT,
  IMSS_ENF_MAT_CUOTA_ADIC_PCT,
  IMSS_PRESTACIONES_DINERO_PCT,
  IMSS_GASTOS_MED_PENS_PCT,
  IMSS_INVALIDEZ_VIDA_PCT,
  IMSS_GUARDERIAS_PCT,
  IMSS_RETIRO_PCT,
  INFONAVIT_PCT,
} from "@/lib/imssConstants";

const initialState: ConfigActionState = { ok: false };

function toPctDisplay(fraction: number) {
  return String(Math.round(fraction * 10000) / 100);
}

/** Igual que toPctDisplay pero a 4 decimales — la tabla CEAV usa tasas
 *  con hasta 3 decimales significativos (ej. 3.676%), y su input ya tiene
 *  step="0.001". Con solo 2 decimales de precisión en el valor por
 *  defecto, guardar la configuración por CUALQUIER otro campo fiscal
 *  reenvía este valor redondeado como si fuera intencional y degrada
 *  silenciosamente la tasa guardada — este helper evita esa pérdida de
 *  precisión. */
function toPctDisplayPrecise(fraction: number) {
  return String(Math.round(fraction * 1000000) / 10000);
}

type Pestana = "empresa" | "fiscal" | "cuentas" | "condiciones";

const PESTANAS: { id: Pestana; label: string }[] = [
  { id: "empresa", label: "Empresa" },
  { id: "fiscal", label: "Fiscal" },
  { id: "cuentas", label: "Cuentas y pagos" },
  { id: "condiciones", label: "Condiciones y términos" },
];

const TODAS_BLOQUEADAS: Record<Pestana, boolean> = { empresa: false, fiscal: false, cuentas: false, condiciones: false };
const CLAVES_EN_CERO: Record<Pestana, number> = { empresa: 0, fiscal: 0, cuentas: 0, condiciones: 0 };

export function ConfigForm({
  config,
  bandasCeav,
  cuentasBancarias,
}: {
  config: SystemConfig;
  bandasCeav: CeavBandaInput[];
  cuentasBancarias: CuentaBancaria[];
}) {
  const [tab, setTab] = useState<Pestana>("empresa");
  const [desbloqueadas, setDesbloqueadas] = useState(TODAS_BLOQUEADAS);
  // Cambiar la clave de una pestaña vuelve a montar sus campos con los valores
  // guardados (así "Cancelar" descarta lo escrito).
  const [claves, setClaves] = useState(CLAVES_EN_CERO);
  const [desbloqueando, setDesbloqueando] = useState<Pestana | null>(null);
  // La contraseña verificada vive SOLO en memoria de esta pantalla (nunca en
  // localStorage ni sessionStorage). Se reenvía como campo oculto para que el
  // servidor la vuelva a verificar en cada guardado protegido (ver
  // saveSystemConfigAction, que no cambia). Se descarta al guardar, al
  // cancelar la última pestaña desbloqueada o al salir de la pantalla.
  const [fiscalPassword, setFiscalPassword] = useState("");

  const [state, formAction, pending] = useActionState(
    async (prev: ConfigActionState, formData: FormData) => {
      const res = await saveSystemConfigAction(prev, formData);
      if (res.ok) {
        setDesbloqueadas(TODAS_BLOQUEADAS);
        setFiscalPassword("");
        setClaves((c) => ({
          empresa: c.empresa + 1,
          fiscal: c.fiscal + 1,
          cuentas: c.cuentas + 1,
          condiciones: c.condiciones + 1,
        }));
      }
      return res;
    },
    initialState
  );

  function desbloquear(p: Pestana, password: string) {
    setDesbloqueadas((d) => ({ ...d, [p]: true }));
    setFiscalPassword(password);
    setDesbloqueando(null);
  }

  function cancelar(p: Pestana) {
    const siguiente = { ...desbloqueadas, [p]: false };
    setDesbloqueadas(siguiente);
    if (!Object.values(siguiente).some(Boolean)) setFiscalPassword("");
    setClaves((c) => ({ ...c, [p]: c[p] + 1 }));
  }

  const err = state.fieldErrors;
  const bloqueada = (p: Pestana) => !desbloqueadas[p];

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="fiscalPassword" value={fiscalPassword} />

      <div className="flex gap-1 overflow-x-auto border-b border-border" role="tablist">
        {PESTANAS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={tab === p.id}
            onClick={() => setTab(p.id)}
            className={cn(
              "-mb-px shrink-0 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === p.id ? "border-primary text-primary" : "border-transparent text-text-muted hover:text-text"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Todas las pestañas siguen montadas (solo se ocultan) para que un único
          envío lleve todos los campos que el servidor espera. */}
      <PestanaCuerpo id="empresa" activa={tab} clave={claves.empresa}>
        <AvisoPestana desbloqueada={desbloqueadas.empresa} onEditar={() => setDesbloqueando("empresa")}>
          Los datos del prestador están protegidos. Lo demás se edita directo.
        </AvisoPestana>
        <Seccion
          titulo="Datos del prestador de servicio"
          hint="Identidad del negocio — se usan en el membrete de las cotizaciones exportadas a Word/PDF."
          protegida
          desbloqueada={desbloqueadas.empresa}
        >
          <LockedField locked={bloqueada("empresa")} name="prestadorNombre" label="Nombre / razón social" defaultValue={config.prestadorNombre} error={err?.prestadorNombre} required />
          <LockedField locked={bloqueada("empresa")} name="prestadorRfc" label="RFC (opcional)" defaultValue={config.prestadorRfc ?? ""} />
          <LockedField locked={bloqueada("empresa")} name="prestadorRegimenFiscal" label="Régimen fiscal (opcional)" defaultValue={config.prestadorRegimenFiscal ?? ""} />
          <LockedField locked={bloqueada("empresa")} name="prestadorTelefono" label="Teléfono (opcional)" defaultValue={config.prestadorTelefono ?? ""} />
          <LockedField locked={bloqueada("empresa")} name="prestadorEmail" label="Correo (opcional)" defaultValue={config.prestadorEmail ?? ""} />
          <LockedField locked={bloqueada("empresa")} name="prestadorDireccion" label="Dirección (opcional)" defaultValue={config.prestadorDireccion ?? ""} className="sm:col-span-2" textarea />
        </Seccion>

        <Seccion titulo="Prima de riesgo (negocio)" hint="Dato de negocio de la empresa — editable sin contraseña.">
          <NumField name="primaRiesgoPct" label="Prima de riesgo de trabajo (%)" defaultValue={toPctDisplay(config.primaRiesgoPct)} error={err?.primaRiesgoPct} />
        </Seccion>

        <Seccion titulo="Prestaciones">
          <NumField name="diasAguinaldo" label="Días de aguinaldo" defaultValue={config.diasAguinaldo} error={err?.diasAguinaldo} step="1" />
          <NumField name="diasVacaciones" label="Días de vacaciones (año 1)" defaultValue={config.diasVacaciones} error={err?.diasVacaciones} step="1" />
          <NumField name="primaVacacionalPct" label="Prima vacacional (%)" defaultValue={toPctDisplay(config.primaVacacionalPct)} error={err?.primaVacacionalPct} />
        </Seccion>

        <Seccion titulo="Jornada laboral">
          <NumField name="horasPorDia" label="Horas por día laboral" defaultValue={config.horasPorDia} error={err?.horasPorDia} step="1" />
          <NumField name="diasPorSemana" label="Días por semana laboral" defaultValue={config.diasPorSemana} error={err?.diasPorSemana} step="1" />
        </Seccion>

        <Seccion titulo="Margen de utilidad">
          <NumField name="margenUtilidadDefaultPct" label="Margen de utilidad por defecto (%)" defaultValue={toPctDisplay(config.margenUtilidadDefaultPct)} error={err?.margenUtilidadDefaultPct} />
        </Seccion>
      </PestanaCuerpo>

      <PestanaCuerpo id="fiscal" activa={tab} clave={claves.fiscal}>
        <AvisoPestana desbloqueada={desbloqueadas.fiscal} onEditar={() => setDesbloqueando("fiscal")}>
          Valores normativos: cambian por ley cada año y están protegidos.
        </AvisoPestana>
        <Seccion titulo="UMA, salario mínimo y tope salarial" hint="Normativo — cambia por ley cada año." protegida desbloqueada={desbloqueadas.fiscal}>
          <NumField locked={bloqueada("fiscal")} name="umaDiaria" label="UMA diaria ($)" defaultValue={config.umaDiaria} error={err?.umaDiaria} step="0.01" />
          <NumField locked={bloqueada("fiscal")} name="umaMensual" label="UMA mensual ($)" defaultValue={config.umaMensual} error={err?.umaMensual} step="0.01" />
          <NumField locked={bloqueada("fiscal")} name="topeSbcUmas" label="Tope SBC (múltiplo de UMA)" defaultValue={config.topeSbcUmas} error={err?.topeSbcUmas} step="1" />
          <NumField locked={bloqueada("fiscal")} name="salarioMinimoDiario" label="Salario mínimo diario ($)" defaultValue={config.salarioMinimoDiario} error={err?.salarioMinimoDiario} step="0.01" />
          <NumField locked={bloqueada("fiscal")} name="salarioMinimoMensual" label="Salario mínimo mensual ($)" defaultValue={config.salarioMinimoMensual} error={err?.salarioMinimoMensual} step="0.01" />
        </Seccion>

        <Seccion
          titulo="Tabla CEAV — Cesantía y Vejez por banda de SBC"
          hint="Cuota patronal según en qué banda cae el SBC mensual del trabajador (Reforma LSS/LSAR, DOF 16-dic-2020). Sube cada enero hasta 2030."
          protegida
          desbloqueada={desbloqueadas.fiscal}
          bare
        >
          <CeavBandasTable bandas={bandasCeav} locked={bloqueada("fiscal")} />
        </Seccion>

        <Seccion
          titulo="IMSS e INFONAVIT (cuotas fijas de ley)"
          hint="Fijas en la Ley del Seguro Social y la Ley del INFONAVIT — no se indexan año con año, así que no son editables. Solo de referencia."
          protegida
          desbloqueada={false}
        >
          <ReadOnlyRate label="Enf. y maternidad — cuota fija (% de 1 UMA mensual)" fraction={IMSS_ENF_MAT_CUOTA_FIJA_PCT} />
          <ReadOnlyRate label="Enf. y maternidad — cuota adicional (% excedente sobre 3 UMA)" fraction={IMSS_ENF_MAT_CUOTA_ADIC_PCT} />
          <ReadOnlyRate label="Enf. y maternidad — en dinero (%)" fraction={IMSS_PRESTACIONES_DINERO_PCT} />
          <ReadOnlyRate label="Gastos médicos pensionados (%)" fraction={IMSS_GASTOS_MED_PENS_PCT} />
          <ReadOnlyRate label="Invalidez y vida (%)" fraction={IMSS_INVALIDEZ_VIDA_PCT} />
          <ReadOnlyRate label="Guarderías y prestaciones sociales (%)" fraction={IMSS_GUARDERIAS_PCT} />
          <ReadOnlyRate label="Retiro — RCV (%)" fraction={IMSS_RETIRO_PCT} />
          <ReadOnlyRate label="INFONAVIT (% del SBC)" fraction={INFONAVIT_PCT} />
        </Seccion>

        <Seccion titulo="ISN e impuestos estatales" protegida desbloqueada={desbloqueadas.fiscal}>
          <NumField locked={bloqueada("fiscal")} name="isnPct" label="ISN Campeche (% de la nómina)" defaultValue={toPctDisplay(config.isnPct)} error={err?.isnPct} suffix="%" />
          <NumField locked={bloqueada("fiscal")} name="impuestoAdicionalPct" label="Impuesto adicional Cultura/Infraestructura/Deporte (% del ISN)" defaultValue={toPctDisplay(config.impuestoAdicionalPct)} error={err?.impuestoAdicionalPct} suffix="%" />
        </Seccion>

        <Seccion titulo="Fiscal (cotización)" hint="IVA y retención ISR de las cotizaciones." protegida desbloqueada={desbloqueadas.fiscal}>
          <NumField locked={bloqueada("fiscal")} name="ivaPct" label="IVA (%)" defaultValue={toPctDisplay(config.ivaPct)} error={err?.ivaPct} />
          <NumField locked={bloqueada("fiscal")} name="retencionIsrPct" label="Retención ISR RESICO Art. 113-J (%, solo Persona Moral)" defaultValue={toPctDisplay(config.retencionIsrPct)} error={err?.retencionIsrPct} />
        </Seccion>
      </PestanaCuerpo>

      <PestanaCuerpo id="cuentas" activa={tab} clave={claves.cuentas}>
        <AvisoPestana desbloqueada={desbloqueadas.cuentas} onEditar={() => setDesbloqueando("cuentas")}>
          Cuentas bancarias y métodos de pago: datos sensibles, protegidos.
        </AvisoPestana>
        <Seccion
          titulo="Cuentas bancarias y métodos de pago"
          hint="Solo las cuentas activas se incluyen en las cotizaciones exportadas. Las cuentas se agregan, activan o eliminan al momento; los métodos de pago se guardan con el botón Guardar."
          protegida
          desbloqueada={desbloqueadas.cuentas}
          bare
        >
          <div className="flex flex-col gap-5">
            <CuentasBancariasPanel cuentas={cuentasBancarias} locked={bloqueada("cuentas")} fiscalPassword={fiscalPassword} />
            <div className="border-t border-border pt-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <p className="text-xs uppercase tracking-wide text-text-dim">Métodos de pago aceptados</p>
                <Badge tone="neutral">Se guardan con el botón Guardar</Badge>
              </div>
              <div className="flex flex-wrap gap-4">
                <CheckboxField locked={bloqueada("cuentas")} name="aceptaEfectivo" label="Efectivo" defaultChecked={config.aceptaEfectivo} />
                <CheckboxField locked={bloqueada("cuentas")} name="aceptaTransferencia" label="Transferencia" defaultChecked={config.aceptaTransferencia} />
                <CheckboxField locked={bloqueada("cuentas")} name="aceptaCheque" label="Cheque" defaultChecked={config.aceptaCheque} />
              </div>
            </div>
          </div>
        </Seccion>
      </PestanaCuerpo>

      <PestanaCuerpo id="condiciones" activa={tab} clave={claves.condiciones}>
        <AvisoPestana desbloqueada={desbloqueadas.condiciones} onEditar={() => setDesbloqueando("condiciones")}>
          Textos que salen en las cotizaciones: protegidos.
        </AvisoPestana>
        <Seccion
          titulo="Condiciones y Términos de la cotización"
          hint="Un texto para cotizaciones de Servicio y otro para Material — se elige automáticamente según el tipo."
          protegida
          desbloqueada={desbloqueadas.condiciones}
        >
          <LockedField
            locked={bloqueada("condiciones")}
            name="condicionesTerminosServicio"
            label="Condiciones y Términos — Servicio"
            defaultValue={config.condicionesTerminosServicio}
            mostrarName="mostrarCondicionesTerminosServicio"
            mostrarDefaultChecked={config.mostrarCondicionesTerminosServicio}
            textarea
          />
          <LockedField
            locked={bloqueada("condiciones")}
            name="condicionesTerminosMaterial"
            label="Condiciones y Términos — Material"
            defaultValue={config.condicionesTerminosMaterial}
            mostrarName="mostrarCondicionesTerminosMaterial"
            mostrarDefaultChecked={config.mostrarCondicionesTerminosMaterial}
            textarea
          />
        </Seccion>
      </PestanaCuerpo>

      {/* Un solo Guardar por pestaña, fijo al fondo (sobre la barra inferior en móvil). */}
      <div
        className="sticky bottom-16 z-20 -mx-1 flex flex-wrap items-center justify-end gap-3 rounded-xl border border-border-strong bg-surface-1/95 px-4 py-3 shadow-lg backdrop-blur lg:bottom-4"
      >
        <div className="mr-auto min-w-0 text-sm">
          {state.error && <span className="text-danger">{state.error}</span>}
          {state.ok && !state.error && <span className="text-success-soft">Configuración guardada.</span>}
        </div>
        {desbloqueadas[tab] && (
          <Button type="button" variant="ghost" onClick={() => cancelar(tab)} disabled={pending}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
      </div>

      {desbloqueando && (
        <UnlockModal
          titulo={`La pestaña «${PESTANAS.find((p) => p.id === desbloqueando)?.label}»`}
          onCancel={() => setDesbloqueando(null)}
          onUnlocked={(password) => desbloquear(desbloqueando, password)}
        />
      )}
    </form>
  );
}

/** Cuerpo de una pestaña: siempre montado, visible solo si es la activa. */
function PestanaCuerpo({
  id,
  activa,
  clave,
  children,
}: {
  id: Pestana;
  activa: Pestana;
  clave: number;
  children: React.ReactNode;
}) {
  return (
    <div key={clave} role="tabpanel" hidden={activa !== id} className={cn("flex-col gap-5", activa === id ? "flex" : "hidden")}>
      {children}
    </div>
  );
}

/** Franja de la pestaña: pide la contraseña una vez ("Editar") o indica que ya se puede editar. */
function AvisoPestana({
  desbloqueada,
  onEditar,
  children,
}: {
  desbloqueada: boolean;
  onEditar: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface-1 px-4 py-3">
      <p className="text-sm text-text-muted">{desbloqueada ? "Pestaña desbloqueada: ya puedes editar sus secciones protegidas." : children}</p>
      {desbloqueada ? (
        <span className="text-xs font-medium text-success-soft">Desbloqueada</span>
      ) : (
        <Button type="button" size="sm" variant="secondary" onClick={onEditar}>
          🔒 Editar
        </Button>
      )}
    </div>
  );
}

/** Sección con indicador Protegido / Editable. `bare` = sin la rejilla de 2 columnas (tablas). */
function Seccion({
  titulo,
  hint,
  protegida = false,
  desbloqueada = false,
  bare = false,
  children,
}: {
  titulo: string;
  hint?: string;
  protegida?: boolean;
  desbloqueada?: boolean;
  bare?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-col items-start gap-1">
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <CardTitle>{titulo}</CardTitle>
          <ProteccionBadge protegido={protegida && !desbloqueada} />
        </div>
        {hint && <p className="text-xs text-text-dim">{hint}</p>}
      </CardHeader>
      <CardContent>
        {bare ? children : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>}
      </CardContent>
    </Card>
  );
}

function CeavBandasTable({ bandas, locked }: { bandas: CeavBandaInput[]; locked: boolean }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-text-dim">
            <th className="py-2 pr-3 font-medium">Banda</th>
            <th className="py-2 pr-3 font-medium">Referencia</th>
            <th className="py-2 text-right font-medium">Cuota patronal</th>
          </tr>
        </thead>
        <tbody>
          {bandas.map((banda) => {
            const name = `ceavPct_${banda.orden}`;
            const defaultValue = toPctDisplayPrecise(banda.porcentajePatronal);
            return (
              <tr key={banda.orden} className="border-b border-border last:border-0">
                <td className="py-2 pr-3 text-text">{banda.etiqueta}</td>
                <td className="py-2 pr-3 text-text-dim">
                  {banda.unidadLimite === "SALARIO_MINIMO" ? "Salario mínimo" : "UMA"}
                </td>
                <td className="py-2 text-right">
                  {locked ? (
                    <span className="font-mono tabular-nums text-text-muted">{defaultValue}%</span>
                  ) : (
                    <Input
                      name={name}
                      type="number"
                      step="0.001"
                      defaultValue={defaultValue}
                      className="ml-auto h-9 w-28 text-right"
                      required
                    />
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Tasa fija de ley (IMSS/INFONAVIT) — solo lectura, sin candado ni name
 *  (nunca se envía en el form; su único origen es la constante de código). */
function ReadOnlyRate({ label, fraction }: { label: string; fraction: number }) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <div className="flex h-10 items-center rounded-lg border border-border bg-surface px-3 text-sm text-text-muted">
        {toPctDisplay(fraction)}%
      </div>
    </Field>
  );
}

function NumField({
  name,
  label,
  defaultValue,
  error,
  step = "0.0001",
  allowEmpty = false,
  locked = false,
  suffix = "",
}: {
  name: string;
  label: string;
  defaultValue: string | number;
  error?: string;
  step?: string;
  allowEmpty?: boolean;
  locked?: boolean;
  suffix?: string;
}) {
  if (locked) {
    return (
      <Field>
        <FieldLabel>{label}</FieldLabel>
        <div className="flex h-10 items-center rounded-lg border border-border bg-surface px-3 text-sm text-text-muted">
          {defaultValue}
          {suffix}
        </div>
      </Field>
    );
  }

  return (
    <Field>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input
        id={name}
        name={name}
        type="number"
        step={step}
        defaultValue={defaultValue}
        required={!allowEmpty}
      />
      <FieldError>{error}</FieldError>
    </Field>
  );
}

/** Igual que NumField pero para texto/textarea (identidad del prestador,
 *  leyendas de la cotización) — mismo criterio de candado: bloqueado
 *  omite `name` por completo, así que un envío sin desbloquear no toca
 *  el campo en el servidor. `mostrarName`/`mostrarDefaultChecked`
 *  (opcionales) agregan la casilla "Incluir en el documento" junto al
 *  label — solo la usan las 6 leyendas de la cotización. */
function LockedField({
  name,
  label,
  defaultValue,
  error,
  locked = false,
  required = false,
  textarea = false,
  className,
  mostrarName,
  mostrarDefaultChecked,
}: {
  name: string;
  label: string;
  defaultValue: string;
  error?: string;
  locked?: boolean;
  required?: boolean;
  textarea?: boolean;
  className?: string;
  mostrarName?: string;
  mostrarDefaultChecked?: boolean;
}) {
  if (locked) {
    return (
      <Field className={className}>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <FieldLabel className="mb-0">{label}</FieldLabel>
          {mostrarName && (
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-text-dim">
              <span className={`h-2 w-2 rounded-full ${mostrarDefaultChecked ? "bg-success-soft" : "bg-text-dim"}`} />
              {mostrarDefaultChecked ? "Incluida" : "Oculta"}
            </span>
          )}
        </div>
        <div className="min-h-10 whitespace-pre-wrap rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-muted">
          {defaultValue || "—"}
        </div>
      </Field>
    );
  }

  return (
    <Field className={className}>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <FieldLabel className="mb-0" htmlFor={name}>{label}</FieldLabel>
        {mostrarName && (
          <MostrarLeyendaCheckbox name={mostrarName} defaultChecked={mostrarDefaultChecked ?? true} />
        )}
      </div>
      {textarea ? (
        <Textarea id={name} name={name} defaultValue={defaultValue} required={required} />
      ) : (
        <Input id={name} name={name} defaultValue={defaultValue} required={required} />
      )}
      <FieldError>{error}</FieldError>
    </Field>
  );
}

/** Checkbox controlado del candado fiscal — cuando está desbloqueado
 *  siempre manda un valor explícito "on"/"off" vía un input oculto (nunca
 *  ausente, a diferencia de un <input type="checkbox"> normal cuando está
 *  desmarcado), para no chocar con la convención de "campo ausente =
 *  sección bloqueada". Bloqueado, solo muestra el estado actual. */
function CheckboxField({
  name,
  label,
  defaultChecked,
  locked = false,
}: {
  name: string;
  label: string;
  defaultChecked: boolean;
  locked?: boolean;
}) {
  const [checked, setChecked] = useState(defaultChecked);

  if (locked) {
    return (
      <span className="flex items-center gap-2 text-sm text-text-muted">
        <span className={`h-2 w-2 rounded-full ${defaultChecked ? "bg-success-soft" : "bg-text-dim"}`} />
        {label}
      </span>
    );
  }

  return (
    <label className="flex items-center gap-2 text-sm text-text-muted">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
        className="h-4 w-4 rounded border-border-strong bg-surface-2 accent-[var(--color-primary)]"
      />
      <input type="hidden" name={name} value={checked ? "on" : "off"} />
      {label}
    </label>
  );
}

/** Igual que CheckboxField pero compacto e inline, para "Incluir en el
 *  documento" junto al label de cada una de las 6 leyendas — mismo patrón
 *  de input oculto "on"/"off" (nunca ausente cuando está desbloqueada). */
function MostrarLeyendaCheckbox({ name, defaultChecked }: { name: string; defaultChecked: boolean }) {
  const [checked, setChecked] = useState(defaultChecked);

  return (
    <label className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-text-dim">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => setChecked(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-border-strong bg-surface-2 accent-[var(--color-primary)]"
      />
      <input type="hidden" name={name} value={checked ? "on" : "off"} />
      Incluir en el documento
    </label>
  );
}
