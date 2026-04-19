<template>
    <div class="printable-calendar-area" @click.capture="onCaptureClick">
        <CalendarReservationsHeader
            v-model:activeTab="activeTab"
            :currentDate="currentDate"
            :formattedDate="formattedCurrentDate"
            :viewMode="viewMode"
            :totalAppointments="totalAppointments"
            :dentists="availableCalendars"
            :selectedDentists="selectedDentists"
            :sidebarVisible="showSidebar"
            @update:viewMode="onViewModeChange"
            @update:selectedDentists="selectedDentists = $event"
            @add-reservation="addReservation"
            @go-today="goToToday"
            @previous-date="previousDate"
            @next-date="nextDate"
            @toggle-sidebar="store.dispatch('ui/toggleCalendarSidebar')"
            @open-settings="openSettings"
            @print-calendar="printCalendar"
            @select-date="(date) => (currentDate = date)"
        />

        <!-- Calendar Content -->
        <div class="calendar-content flex" v-if="activeTab === 'calendar'">
            <DoctorSidebarFilter
                :visible="showSidebar"
                :dentists="availableCalendars"
                v-model:selectedDentists="selectedDentists"
                :singleSelect="viewMode === 'week' || viewMode === 'month'"
                :title="showAllUsersInCalendar ? t('calendar.calendars', 'Calendars') : (t('calendar.dentist') || 'Doctors')"
                :allLabel="showAllUsersInCalendar ? t('calendar.all_calendars', 'All calendars') : 'All team'"
            />
            <div class="flex-1 overflow-x-hidden">
                <a-spin :spinning="loading" tip="Loading calendar...">
                    <!-- Calendar Grid -->
                    <CalendarReservationsGrid
                        v-if="
                            viewMode === 'day' ||
                            viewMode === 'week' ||
                            viewMode === 'day_single'
                        "
                        :viewMode="gridViewMode"
                        :weekDays="weekDays"
                        :timeSlots="timeSlots"
                        :dentists="filteredDentists"
                        :currentDate="currentDate"
                        :appointmentSlots="appointmentSlots"
                        :appointments="visibleAppointments"
                        :doctorHolidays="doctorHolidays"
                        :timezoneOffset="timezoneName"
                        :isBreakTime="isBreakTime"
                        :isDoctorOnBreak="isDoctorOnBreak"
                        :isSlotUnavailable="isSlotUnavailable"
                        :isDoctorOnHoliday="isDoctorOnHoliday"
                        :isSlotOccupied="isSlotOccupied"
                        :isHourly="isHourly"
                        :draggedAppointmentId="draggedAppointmentId"
                        :resizingAppointmentId="resizingAppointmentId"
                        :isPopoverOpen="slotAppointmentModalVisible || previewPopoverVisible"
                        :isOutsideSchedule="isOutsideSchedule"
                        @toggle-dentist-menu="toggleDentistMenu"
                        @slot-click="onSlotClick"
                        @appointment-click="openAppointment"
                        @appointment-move="onAppointmentMove"
                        @drag-start="onDragStart"
                        @drag-end="onDragEnd"
                        @drag-move="onDragMove"
                        @resize-start="onResizeStart"
                        @resize-end="onAppointmentResize"
                        @task-complete-change="onTaskCompleteChange"
                    />
                    <!-- Month Grid View -->
                    <CalendarReservationsMonth
                        v-else-if="viewMode === 'month'"
                        :currentDate="currentDate"
                        :appointments="visibleAppointments"
                        :dentists="availableCalendars"
                        @appointment-click="openAppointment"
                        @day-click="handleMonthDayClick"
                        @change-view="handleViewChange"
                        @task-complete-change="onTaskCompleteChange"
                    />
                    <!-- Agenda List View -->
                    <CalendarReservationsAgenda
                        v-else-if="viewMode === 'agenda'"
                        :appointments="visibleAppointments"
                        :dentists="availableCalendars"
                        :currentDate="currentDate"
                        @appointment-click="openAppointment"
                        @task-complete-change="onTaskCompleteChange"
                    />
                </a-spin>
            </div>
        </div>

        <!-- Appointment Modal -->
        <AppointmentIndex
            :visible="appointmentModalVisible"
            :formData="appointmentFormData"
            :autoSelectPatient="false"
            @closed="closeAppointmentModal"
            @addEditSuccess="onAppointmentSave"
        />
        <!-- Event Modal -->
        <EventModal
            :visible="eventModalVisible"
            :initialData="appointmentFormData"
            @closed="eventModalVisible = false"
            @addEditSuccess="onAppointmentSave"
            :autoSelectDoctor="false"
        />

        <!-- Reschedule Confirmation Modal -->
        <CalendarRescheduleModal
            v-model:visible="rescheduleModalVisible"
            :data="rescheduleData"
            :loading="isRescheduling"
            @confirm="confirmReschedule"
            @cancel="cancelReschedule"
        />

        <!-- Slot Appointment Popover -->
        <a-popover
            :open="slotAppointmentModalVisible"
            @openChange="handlePopoverOpenChange"
            trigger="click"
            placement="right"
            :destroyTooltipOnHide="false"
            :overlayInnerStyle="{
                padding: 0,
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }"
            :arrowPointAtCenter="true"
        >
            <template #content>
                <SlotAppointmentPopover
                    :visible="slotAppointmentModalVisible"
                    :formData="slotAppointmentFormData"
                    :doctorInfo="{}"
                    @closed="closeSlotAppointmentModal"
                    @addEditSuccess="onAppointmentSave"
                    @warningState="isWarningModalOpen = $event"
                />
            </template>
            <!-- Invisible Anchor Box positioned exactly over the clicked slot -->
            <div
                class="fixed pointer-events-none z-50 transition-none"
                :style="popoverAnchorStyle"
            ></div>
        </a-popover>

        <!-- Task Modal -->
        <TaskModal
            :visible="taskModalVisible"
            :initialData="appointmentFormData"
            @closed="taskModalVisible = false"
            @addEditSuccess="onAppointmentSave"
            :autoSelectDoctor="false"
        />

        <!-- Appointment/Event/Task Preview Popover -->
        <a-popover
            :open="previewPopoverVisible"
            @openChange="handlePreviewOpenChange"
            trigger="click"
            placement="right"
            :destroyTooltipOnHide="false"
            :overlayInnerStyle="{
                padding: 0,
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }"
            :arrowPointAtCenter="true"
        >
            <template #content>
                <AppointmentPreviewPopover
                    :visible="previewPopoverVisible"
                    :formData="previewFormData"
                    @closed="closePreviewPopover"
                    @addEditSuccess="onPreviewSave"
                    @warningState="isWarningModalOpen = $event"
                />
            </template>
            <div
                class="fixed pointer-events-none z-50 transition-none"
                :style="previewAnchorStyle"
            ></div>
        </a-popover>
    </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from "vue";
import { useStore } from "vuex";
import { CalendarOutlined } from "@ant-design/icons-vue";
import { message } from "ant-design-vue";
import { useI18n } from "vue-i18n";
import moment from "moment";
import { debounce } from "lodash-es";
import AppointmentIndex from "../../../../main/components/appointment/index.vue";
import CalendarReservationsAgenda from "./CalendarAgenda.vue";
import CalendarReservationsMonth from "./CalendarMonth.vue";
import EventModal from "../../../../main/components/appointment/EventModal.vue";
import TaskModal from "../../../../main/components/appointment/TaskModal.vue";
import SlotAppointmentPopover from "../../../../main/components/appointment/SlotAppointmentPopover.vue";
import AppointmentPreviewPopover from "../../../../main/components/appointment/AppointmentPreviewPopover.vue";
import CalendarReservationsHeader from "./Calendar/Header.vue";
import CalendarReservationsGrid from "./CalendarGrid.vue";
import CalendarRescheduleModal from "./CalendarModal.vue";
import DoctorSidebarFilter from "./CalendarSidebar.vue";
import apiAdmin from "@composable/apiAdmin";
import common from "@composable/common";
import useSettingsModal from "@composable/useSettingsModal";

const { t } = useI18n();
const { loading, addEditRequestAdmin } = apiAdmin();
const { selectedClinicId, clinicSchedules } = common();
const { openModal } = useSettingsModal();
const store = useStore();

const showWeekends = computed(() => store.state.calendar.showWeekends);
const showCompletedTasks = computed(
    () => store.state.calendar.showCompletedTasks,
);
const showAllUsers = computed(() => store.state.calendar.showAllUsers);

// Constants
const SLOT_DURATION_MINUTES = 15;
const DEFAULT_TIME_SLOTS = [
    "9am",
    "9:30am",
    "10am",
    "10:30am",
    "11am",
    "11:30am",
    "12pm",
    "12:30pm",
    "1pm",
    "1:30pm",
    "2pm",
    "2:30pm",
    "3pm",
    "3:30pm",
    "4pm",
    "4:30pm",
    "5pm",
    "5:30pm",
    "6pm",
];
const DATE_FORMAT_DB = "YYYY-MM-DD";
const TIME_FORMAT_DB = "HH:mm:ss";
const TIME_FORMAT_DISPLAY = "h:mm A";

// Reactive Data
const activeTab = ref("calendar");
const showSidebar = computed({
    get: () => store.state.ui.calendarSidebarVisible,
    set: (val) => store.dispatch("ui/setCalendarSidebarVisible", val),
});
const viewMode = computed({
    get: () => store.state.calendar.viewMode,
    set: (val) => store.dispatch("calendar/setViewMode", val),
});
const currentDate = ref(moment());
const selectedDentists = computed({
    get: () => {
        if (viewMode.value === "week") {
            const dentistId = store.state.calendar.selectedDentistWeek;
            return dentistId ? [dentistId] : [];
        } else if (viewMode.value === "month") {
            const dentistId = store.state.calendar.selectedDentistMonth;
            return dentistId ? [dentistId] : [];
        }
        // day and day_single both use the multi-select dentist array
        return store.state.calendar.selectedDentistsDay;
    },
    set: (val) => {
        if (viewMode.value === "week") {
            store.dispatch("calendar/setSelectedDentistWeek", val[0] || null);
        } else if (viewMode.value === "month") {
            store.dispatch("calendar/setSelectedDentistMonth", val[0] || null);
        } else {
            // day and day_single both use the multi-select dentist array
            store.dispatch("calendar/setSelectedDentistsDay", val);
        }
    },
});
const isInitialized = ref(false);
const timezoneOffset = ref("+07:00");
const timezoneName = ref(
    new Date()
        .toLocaleTimeString("en-us", { timeZoneName: "short" })
        .split(" ")
        .pop(),
);

// API Data
const dentists = ref([]);
const allUsers = ref([]);
const appointments = ref([]);
const doctorHolidays = ref([]); // Replaces doctorBreaks/Holidays split if needed, or keeping usage

const uniqueCalendarsByXid = (items = []) => {
    const seen = new Set();

    return items.filter((item) => {
        if (!item?.xid || seen.has(item.xid)) {
            return false;
        }

        seen.add(item.xid);
        return true;
    });
};

const supportsAllUsersInView = computed(() =>
    ["day_single", "week", "month", "agenda"].includes(viewMode.value),
);

const showAllUsersInCalendar = computed(
    () => supportsAllUsersInView.value && showAllUsers.value,
);

const availableCalendars = computed(() =>
    uniqueCalendarsByXid(
        showAllUsersInCalendar.value ? allUsers.value : dentists.value,
    ),
);

const getDentistRecord = (doctorId) => {
    if (!doctorId) return null;
    return (
        availableCalendars.value.find((dentist) => dentist.xid === doctorId) ||
        dentists.value.find((dentist) => dentist.xid === doctorId) ||
        allUsers.value.find((dentist) => dentist.xid === doctorId) ||
        null
    );
};

const getDentistUserIdByDoctorId = (doctorId) => {
    const dentist = getDentistRecord(doctorId);
    return dentist?.x_user_id || dentist?.user_id || null;
};

const resolveCalendarUserId = (appointment, doctorId = null) => {
    return (
        getDentistUserIdByDoctorId(doctorId) ||
        appointment?.user_id ||
        getDentistUserIdByDoctorId(appointment?.doctor_id || appointment?.dentist_id) ||
        null
    );
};

// UI State
const appointmentModalVisible = ref(false);
const eventModalVisible = ref(false);
const taskModalVisible = ref(false);
const appointmentFormData = ref({});
const slotAppointmentModalVisible = ref(false);
const slotAppointmentFormData = ref({});
const previewPopoverVisible = ref(false);
const previewFormData = ref({});
const previewAnchorStyle = ref({
    top: "-9999px",
    left: "-9999px",
    width: "0px",
    height: "0px",
    position: "fixed",
});
const lastClickPosition = ref(null);
const popoverAnchorStyle = ref({
    top: "-9999px",
    left: "-9999px",
    width: "0px",
    height: "0px",
    position: "fixed",
});
const appointmentSlots = ref({});
const draggedAppointmentId = ref(null);
const resizingAppointmentId = ref(null);
const isWarningModalOpen = ref(false);

const rescheduleModalVisible = ref(false);
const rescheduleData = ref(null);
const isRescheduling = ref(false);

// --- Computed Properties ---

const weekDays = computed(() => {
    if (viewMode.value !== "week") return [];

    const startOfWeek = currentDate.value.clone().startOf("isoWeek");
    const days = [];
    for (let i = 0; i < 7; i++) {
        const day = startOfWeek.clone().add(i, "days");
        const dayOfWeek = day.day(); // 0=Sun, 6=Sat
        if (!showWeekends.value && (dayOfWeek === 0 || dayOfWeek === 6)) {
            continue;
        }
        days.push({
            date: day.format(DATE_FORMAT_DB),
            momentObj: day,
            label: day.format("D ddd"),
        });
    }
    return days;
});

const formattedCurrentDate = computed(() => {
    if (viewMode.value === "week" && weekDays.value.length > 0) {
        const startMonth = weekDays.value[0].momentObj.format("MMM");
        const lastDay = weekDays.value[weekDays.value.length - 1];
        const endMonth = lastDay.momentObj.format("MMM");
        const endYear = lastDay.momentObj.format("YYYY");

        if (startMonth !== endMonth) {
            return `${startMonth} - ${endMonth} ${endYear}`;
        }
        return `${startMonth} ${endYear}`;
    }
    if (viewMode.value === "month" || viewMode.value === "agenda") {
        return currentDate.value.format("MMMM YYYY");
    }
    if (viewMode.value === "day_single") {
        return currentDate.value.format("ddd, DD MMM YYYY");
    }
    return currentDate.value.format("ddd, DD MMM YYYY");
});

const totalAppointments = computed(() => {
    if (viewMode.value === "week") {
        return appointments.value.length;
    }
    const dateStr = currentDate.value.format(DATE_FORMAT_DB);
    return appointments.value.filter((a) => a.appointment_date === dateStr)
        .length;
});

const visibleAppointments = computed(() => {
    if (showCompletedTasks.value) return appointments.value;
    return appointments.value.filter(
        (a) => a.type !== "task" || !a.is_completed,
    );
});

// Maps day_single → 'day' for CalendarReservationsGrid (reuses existing day-view rendering)
const gridViewMode = computed(() =>
    viewMode.value === "day_single" ? "day" : viewMode.value,
);

const filteredDentists = computed(() => {
    if (selectedDentists.value?.length > 0) {
        return availableCalendars.value.filter((d) =>
            selectedDentists.value.includes(d.xid),
        );
    }
    return [];
});

const hasScheduleForCurrentDay = computed(() => {
    if (viewMode.value === "week") return true;
    return hasScheduleForDay(currentDate.value);
});

const currentClinicSchedule = computed(() => {
    if (!clinicSchedules.value || clinicSchedules.value.length === 0)
        return null;

    const currentDayOfWeek = currentDate.value.isoWeekday();
    const currentClinicId = selectedClinicId.value;

    let daySchedule = null;
    if (currentClinicId) {
        daySchedule = clinicSchedules.value.find(
            (s) =>
                s.day_of_week === currentDayOfWeek &&
                (s.x_clinic_id === currentClinicId ||
                    s.clinic_id === currentClinicId),
        );
    }
    // Fallback or if no clinic selected
    if (!daySchedule && !currentClinicId) {
        daySchedule = clinicSchedules.value.find(
            (s) => s.day_of_week === currentDayOfWeek,
        );
    }

    return daySchedule;
});

const timeSlots = computed(() => {
    const slots = [];
    // Start at 12:00 AM
    const startTime = moment("00:00:00", TIME_FORMAT_DB);
    // End at 11:59 PM
    const endTime = moment("23:59:59", TIME_FORMAT_DB);

    // Clone to iterate
    let current = startTime.clone();

    while (current.isBefore(endTime)) {
        const hour = current.hour();
        const minute = current.minute();
        const period = hour >= 12 ? "pm" : "am";
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;

        const timeStr =
            minute === 0
                ? `${displayHour}${period}`
                : `${displayHour}:${minute.toString().padStart(2, "0")}${period}`;

        slots.push(timeStr);
        current.add(SLOT_DURATION_MINUTES, "minutes");
    }

    return slots;
});

watch(
    slotAppointmentFormData,
    () => {
        if (slotAppointmentModalVisible.value) {
            updateAppointmentSlots();
        }
    },
    { deep: true },
);

watch(
    () => slotAppointmentModalVisible.value,
    (visible) => {
        if (!visible) {
            updateAppointmentSlots();
        }
    },
);

// --- Helpers ---

const isHourly = (time) => !time.includes(":");

const hasScheduleForDay = (date) => {
    if (!clinicSchedules.value || clinicSchedules.value.length === 0)
        return true;

    const dayOfWeek = date.isoWeekday();
    const currentClinicId = selectedClinicId.value;

    if (currentClinicId) {
        return clinicSchedules.value.some(
            (s) =>
                s.day_of_week === dayOfWeek &&
                (s.x_clinic_id === currentClinicId ||
                    s.clinic_id === currentClinicId),
        );
    }
    return clinicSchedules.value.some((s) => s.day_of_week === dayOfWeek);
};

const formatTimeSlot = (momentObj) => {
    const hour = momentObj.hour();
    const minute = momentObj.minute();
    const period = hour >= 12 ? "pm" : "am";
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    if (minute === 0) return `${displayHour}${period}`;
    return `${displayHour}:${minute.toString().padStart(2, "0")}${period}`;
};

const convertAppointmentTimeToSlot = (timeStr) => {
    return formatTimeSlot(moment(timeStr, TIME_FORMAT_DISPLAY));
};

const convertToTime24 = (timeSlot) => {
    const match = timeSlot.match(/^(\d+)(?::(\d+))?(am|pm)$/i);
    if (!match) return "00:00";

    let [_, h, m, p] = match;
    let hour = parseInt(h);
    const minute = m ? parseInt(m) : 0;
    const isPM = p.toLowerCase() === "pm";

    if (isPM && hour !== 12) hour += 12;
    else if (!isPM && hour === 12) hour = 0;

    return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
};

const isDoctorOnHoliday = (doctorId, dateStr) => {
    return doctorHolidays.value.some(
        (h) => h.doctor_id === doctorId && h.date === dateStr,
    );
};

const isDoctorOnBreak = (doctorId, timeSlot, dateStr) => {
    const doctor = dentists.value.find((d) => d.xid === doctorId);
    if (!doctor?.breaks?.length) return false;

    const slotTime24 = convertToTime24(timeSlot) + ":00";
    // moment isoWeekday: 1=Monday ... 7=Sunday
    const dayOfWeek = moment(dateStr, "YYYY-MM-DD").isoWeekday();

    return doctor.breaks.some((b) => {
        if (b.day_of_week !== dayOfWeek) return false;
        return slotTime24 >= b.break_from && slotTime24 < b.break_to;
    });
};

const isBreakTime = (timeSlot, dateStr = null) => {
    const targetDateStr = dateStr || currentDate.value.format(DATE_FORMAT_DB);
    return dentists.value.some((d) =>
        isDoctorOnBreak(d.xid, timeSlot, targetDateStr),
    );
};

const isSlotUnavailable = (dentistId, timeSlot, dateStr = null) => {
    const targetDateStr = dateStr || currentDate.value.format(DATE_FORMAT_DB);
    if (!dentistId || dentistId === "week-view") return false; // Generic column

    const doctor = dentists.value.find((d) => d.xid === dentistId);

    if (!doctor) return true;
    if (!doctor.available || doctor.is_on_holiday) return true;
    if (isDoctorOnHoliday(dentistId, targetDateStr)) return true;
    if (isDoctorOnBreak(dentistId, timeSlot, targetDateStr)) return true;

    return false;
};

const getAppointmentDurationInSlots = (appointment) => {
    const start = moment(appointment.start_time, TIME_FORMAT_DISPLAY);
    const end = moment(appointment.end_time, TIME_FORMAT_DISPLAY);
    const duration = end.diff(start, "minutes");
    return Math.max(1, Math.ceil(duration / SLOT_DURATION_MINUTES));
};

const isSlotOccupied = (dentistId, timeSlot, dateStr = null) => {
    const slotIndex = timeSlots.value.indexOf(timeSlot);
    if (slotIndex === -1) return false;

    const targetDateStr = dateStr || currentDate.value.format(DATE_FORMAT_DB);

    return appointments.value.some((apt) => {
        if (
            dentistId &&
            dentistId !== "week-view" &&
            apt.dentist_id !== dentistId
        )
            return false;
        if (apt.appointment_date !== targetDateStr) return false;

        const startSlot = convertAppointmentTimeToSlot(apt.start_time);
        const startIndex = timeSlots.value.indexOf(startSlot);
        if (startIndex === -1) return false;

        const duration = getAppointmentDurationInSlots(apt);
        // Check if current slot is within [start + 1, start + duration - 1]
        return slotIndex > startIndex && slotIndex < startIndex + duration;
    });
};

const isOutsideSchedule = (timeSlot, dateStr = null) => {
    if (store.state.calendar.showOffHours) {
        return false;
    }

    const targetDate = dateStr
        ? moment(dateStr, DATE_FORMAT_DB)
        : currentDate.value;
    const dayOfWeek = targetDate.isoWeekday();
    const currentClinicId = selectedClinicId.value;

    let daySchedule = null;
    if (clinicSchedules.value && clinicSchedules.value.length > 0) {
        if (currentClinicId) {
            daySchedule = clinicSchedules.value.find(
                (s) =>
                    s.day_of_week === dayOfWeek &&
                    (s.x_clinic_id === currentClinicId ||
                        s.clinic_id === currentClinicId),
            );
        }
        if (!daySchedule && !currentClinicId) {
            daySchedule = clinicSchedules.value.find(
                (s) => s.day_of_week === dayOfWeek,
            );
        }
    }

    // Default to closed if no schedule found (clinic only saves open days)
    if (!daySchedule) return true;

    const slotTime24 = convertToTime24(timeSlot) + ":00";
    const startTime = daySchedule.start_time;
    const endTime = daySchedule.end_time;

    return slotTime24 < startTime || slotTime24 >= endTime;
};

// --- Actions (Navigation, API, User Interaction) ---

const onTabChange = (key) => (activeTab.value = key);

const goToToday = () => (currentDate.value = moment());

const findAdjacentScheduleDay = (startDate, direction) => {
    let check = startDate.clone();

    if (store.state.calendar.showOffHours) {
        return check.add(direction, "day");
    }

    for (let i = 0; i < 14; i++) {
        check.add(direction, "day");
        if (hasScheduleForDay(check)) return check;
    }
    return startDate;
};

const previousDate = () => {
    if (viewMode.value === "day" || viewMode.value === "day_single") {
        currentDate.value = findAdjacentScheduleDay(currentDate.value, -1);
    } else if (viewMode.value === "week") {
        currentDate.value = currentDate.value.clone().subtract(1, "week");
    } else {
        // month and agenda views navigate by a full month
        currentDate.value = currentDate.value.clone().subtract(1, "month");
    }
};

const nextDate = () => {
    if (viewMode.value === "day" || viewMode.value === "day_single") {
        currentDate.value = findAdjacentScheduleDay(currentDate.value, 1);
    } else if (viewMode.value === "week") {
        currentDate.value = currentDate.value.clone().add(1, "week");
    } else {
        // month and agenda views navigate by a full month
        currentDate.value = currentDate.value.clone().add(1, "month");
    }
};

const onViewModeChange = async (mode) => {
    viewMode.value = mode;
};

const handleMonthDayClick = (date, event) => {
    // Open add appointment popover instead of switching to day view
    const dateStr = date.format(DATE_FORMAT_DB);
    addAppointmentToSlot(null, "09:00am", event, dateStr);
};

const handleViewChange = ({ mode, date }) => {
    if (date) currentDate.value = date;
    if (mode) viewMode.value = mode;
};

const toggleDentistMenu = (dentistId) => {
    // Show actions for dentist
    message.info(`Menu for ${dentistId}`);
};

// --- API Calls ---

const fetchCalendarDoctors = async () => {
    try {
        const params = new URLSearchParams();
        if (selectedClinicId.value) {
            params.append("clinic_id", selectedClinicId.value);
        }

        const res = await window.axiosAdmin.get(
            `calendar-doctors?${params.toString()}`,
        );

        if (res.success) {
            dentists.value = uniqueCalendarsByXid(res.data.doctors || []);
            allUsers.value = uniqueCalendarsByXid(
                res.data.users || res.data.doctors || [],
            );
        }
    } catch (e) {
        console.error(e);
        message.error(t("common.error_loading_data"));
    }
};

const fetchCalendarData = async ({ background = false } = {}) => {
    if (!background) loading.value = true;
    try {
        let dateStr, endDateStr;
        if (viewMode.value === "week") {
            const startOfWeek = currentDate.value.clone().startOf("isoWeek");
            const endOfWeek = startOfWeek.clone().add(6, "days");
            dateStr = startOfWeek.format(DATE_FORMAT_DB);
            endDateStr = endOfWeek.format(DATE_FORMAT_DB);
        } else if (viewMode.value === "agenda" || viewMode.value === "month") {
            const startOfMonth = currentDate.value.clone().startOf("month");
            const endOfMonth = currentDate.value.clone().endOf("month");

            // Month view needs padding days to fill the grid
            const fetchStart =
                viewMode.value === "month"
                    ? startOfMonth.clone().startOf("isoWeek")
                    : startOfMonth;
            const fetchEnd =
                viewMode.value === "month"
                    ? endOfMonth.clone().endOf("isoWeek")
                    : endOfMonth;

            dateStr = fetchStart.format(DATE_FORMAT_DB);
            endDateStr = fetchEnd.format(DATE_FORMAT_DB);
        } else {
            dateStr = currentDate.value.format(DATE_FORMAT_DB);
            endDateStr = dateStr;
        }

        const params = new URLSearchParams({
            date: dateStr, // keep for legacy if the API requires 'date'
            start_date: dateStr,
            end_date: endDateStr,
        });

        if (selectedDentists.value?.length) {
            const selectedDoctorIds = availableCalendars.value
                .filter(
                    (calendarUser) =>
                        selectedDentists.value.includes(calendarUser.xid) &&
                        calendarUser.calendar_type === "doctor",
                )
                .map((calendarUser) => calendarUser.xid);
            const selectedUserIds = availableCalendars.value
                .filter(
                    (calendarUser) =>
                        selectedDentists.value.includes(calendarUser.xid) &&
                        calendarUser.calendar_type === "user",
                )
                .map((calendarUser) => calendarUser.user_id || calendarUser.x_user_id)
                .filter(Boolean);

            if (selectedDoctorIds.length) {
                params.append("doctor_ids", selectedDoctorIds.join(","));
            }
            if (selectedUserIds.length) {
                params.append("user_ids", selectedUserIds.join(","));
            }
        }
        if (selectedClinicId.value) {
            params.append("clinic_id", selectedClinicId.value);
        }

        const res = await window.axiosAdmin.get(
            `calendar-data?${params.toString()}`,
        );

        if (res.success) {
            isInitialized.value = true;
            appointments.value = [
                ...(res.data.appointments || []),
                ...(res.data.events || []),
                ...(res.data.tasks || []),
            ];
            doctorHolidays.value = res.data.holidays || [];
            updateAppointmentSlots();
        }
    } catch (e) {
        console.error(e);
        message.error(t("common.error_loading_data"));
    } finally {
        if (!background) loading.value = false;
    }
};

const debouncedFetchData = debounce(() => {
    fetchCalendarData();
}, 300);

// --- Wrapper Logic ---

const draftAppointment = computed(() => {
    if (
        !slotAppointmentModalVisible.value ||
        !slotAppointmentFormData.value.selectedTimeSlot
    ) {
        return null;
    }

    const formData = slotAppointmentFormData.value;

    // Parse start time
    const isPM = formData.selectedTimeSlot.toLowerCase().includes("pm");
    const [timePart] = formData.selectedTimeSlot.toLowerCase().split(/am|pm/);
    const [hours, minutes] = timePart.split(":");

    let hour = parseInt(hours);
    if (isPM && hour !== 12) hour += 12;
    else if (!isPM && hour === 12) hour = 0;

    const startObj = moment()
        .hour(hour)
        .minute(minutes || 0)
        .second(0);
    const startTimeStr = startObj.format("HH:mm:ss");

    // Calculate end time
    const durationMins =
        formData.duration_unit === "hours"
            ? parseInt(formData.duration_display || 1) * 60
            : parseInt(formData.duration_display || 30);

    const endObj = startObj.clone().add(durationMins, "minutes");
    const endTimeStr = endObj.format("HH:mm:ss");

    // Month is 0-indexed in JS date objects, +1 for API format
    const monthStr = String((formData.currentMonth || 0) + 1).padStart(2, "0");
    const dateStr = String(formData.selectedDate || 1).padStart(2, "0");
    const apptDateStr = `${formData.currentYear}-${monthStr}-${dateStr}`;

    return {
        id: "draft-1",
        xid: "draft-1",
        is_draft: true, // Special flag for styling
        dentist_id: formData.doctor_id,
        patient: {
            name:
                formData.form_type === "event"
                    ? t("calendar.new_event")
                    : formData.form_type === "task"
                      ? t("calendar.new_task")
                      : t("appointments.new_appointment"),
        },
        treatment_type: { name: t("common.draft", "Draft") },
        appointment_date: apptDateStr,
        start_time: startTimeStr,
        end_time: endTimeStr,
        status: "draft",
        color:
            formData.form_type === "event"
                ? formData.color
                : formData.form_type === "task"
                  ? formData.color
                  : "#039be5",
    };
});

const updateAppointmentSlots = () => {
    const newSlots = {};
    const dateStr = currentDate.value.format(DATE_FORMAT_DB);

    // Filter appointments for current view
    let activeAppointments = [];
    if (viewMode.value === "day" || viewMode.value === "day_single") {
        activeAppointments = visibleAppointments.value.filter(
            (apt) => apt.appointment_date === dateStr,
        );
    } else {
        activeAppointments = [...visibleAppointments.value];
    }

    // Inject the draft appointment if it exists
    if (draftAppointment.value) {
        if (
            (viewMode.value === "day" || viewMode.value === "day_single") &&
            draftAppointment.value.appointment_date === dateStr
        ) {
            activeAppointments.push(draftAppointment.value);
        } else if (viewMode.value === "week") {
            // Include draft in week view
            activeAppointments.push(draftAppointment.value);
        }
    }

    // Group to process layout isolated per column
    // All-day items are excluded: they render in the sticky header row and
    // should never influence the timed-event overlap/column-packing logic.
    const visualGroups = {};
    activeAppointments.forEach((apt) => {
        if (apt.is_all_day) {
            apt._visual_col = 0;
            apt._visual_max_cols = 1;
            return;
        }
        const groupKey =
            viewMode.value === "day" || viewMode.value === "day_single"
                ? apt.dentist_id
                : apt.appointment_date;
        if (!visualGroups[groupKey]) {
            visualGroups[groupKey] = [];
        }
        visualGroups[groupKey].push(apt);
    });

    Object.values(visualGroups).forEach((group) => {
        // 1. Sort by start time.
        // Duration tie-breaker: longer events sorting
        group.sort((a, b) => {
            const startA = moment(a.start_time, TIME_FORMAT_DISPLAY);
            const startB = moment(b.start_time, TIME_FORMAT_DISPLAY);
            if (startA.isBefore(startB)) return -1;
            if (startA.isAfter(startB)) return 1;

            // Tie-break: longer first (Duration Descending)
            const endA = moment(a.end_time, TIME_FORMAT_DISPLAY);
            const endB = moment(b.end_time, TIME_FORMAT_DISPLAY);
            const durA = endA.diff(startA);
            const durB = endB.diff(startB);
            return durB - durA;
        });

        // 2. Assign columns (Greedy packing)
        const columns = []; // Array of "last end time" for each column

        group.forEach((apt) => {
            const start = moment(apt.start_time, TIME_FORMAT_DISPLAY);
            const end = moment(apt.end_time, TIME_FORMAT_DISPLAY);

            let placed = false;
            for (let i = 0; i < columns.length; i++) {
                const lastEnd = columns[i];
                if (lastEnd.isSameOrBefore(start)) {
                    // Fits in this column
                    columns[i] = end;
                    apt._visual_col = i;
                    placed = true;
                    break;
                }
            }

            if (!placed) {
                // Start new column
                columns.push(end);
                apt._visual_col = columns.length - 1;
            }
        });

        // 3. Mark total columns (for calculating offsets/widths if needed)
        // For cascading, we mostly care about _visual_col index.
        const meta = group.map((apt) => ({
            apt,
            start: moment(apt.start_time, TIME_FORMAT_DISPLAY),
            end: moment(apt.end_time, TIME_FORMAT_DISPLAY),
            col: apt._visual_col,
        }));

        meta.forEach((item) => {
            const overlappingGroup = meta.filter(
                (other) =>
                    other.start.isBefore(item.end) &&
                    other.end.isAfter(item.start),
            );
            const maxCol = Math.max(...overlappingGroup.map((o) => o.col));
            item.apt._visual_max_cols = maxCol + 1;
        });
    });

    // Populate the slot map
    activeAppointments.forEach((apt) => {
        const slotTime = apt.is_all_day
            ? "all-day"
            : convertAppointmentTimeToSlot(apt.start_time);

        if (viewMode.value === "day" || viewMode.value === "day_single") {
            // Tasks without a specific doctor go to the first visible column only
            const colKey =
                apt.type === "task" && !apt.dentist_id
                    ? filteredDentists.value[0]?.xid
                    : apt.dentist_id;
            if (!colKey) return;
            const key = `${colKey}-${slotTime}`;
            if (!newSlots[key]) newSlots[key] = [];
            newSlots[key].push(apt);
        } else {
            const key = `${apt.appointment_date}-${slotTime}`;
            if (!newSlots[key]) newSlots[key] = [];
            newSlots[key].push(apt);
        }
    });

    // Add deadline markers to the all-day row for tasks that have a deadline.
    // The marker appears on the deadline date column, not the task start date.
    visibleAppointments.value.forEach((apt) => {
        if (apt.type !== "task" || !apt.deadline) return;
        const deadlineDate = apt.deadline.split(" ")[0]; // 'YYYY-MM-DD'

        // Skip if the task is already shown as an all-day entry on its deadline date
        if (apt.is_all_day && apt.appointment_date === deadlineDate) return;

        if (viewMode.value === "day" || viewMode.value === "day_single") {
            if (deadlineDate !== dateStr) return;
            const colKey =
                !apt.dentist_id
                    ? filteredDentists.value[0]?.xid
                    : apt.dentist_id;
            if (!colKey) return;
            const key = `${colKey}-all-day`;
            if (!newSlots[key]) newSlots[key] = [];
            newSlots[key].push({
                ...apt,
                is_deadline_marker: true,
                _visual_col: 0,
                _visual_max_cols: 1,
            });
        } else {
            const isInWeek = weekDays.value?.some((d) => d.date === deadlineDate);
            if (!isInWeek) return;
            const key = `${deadlineDate}-all-day`;
            if (!newSlots[key]) newSlots[key] = [];
            newSlots[key].push({
                ...apt,
                is_deadline_marker: true,
                _visual_col: 0,
                _visual_max_cols: 1,
            });
        }
    });

    appointmentSlots.value = newSlots;
};

const addReservation = (form_type = "appointment") => {
    appointmentFormData.value = {
        currentMonth: currentDate.value.month(),
        currentYear: currentDate.value.year(),
        selectedDate: currentDate.value.date(),
        form_type: form_type,
    };
    if (form_type === "event") {
        eventModalVisible.value = true;
    } else if (form_type === "task") {
        taskModalVisible.value = true;
    } else {
        appointmentModalVisible.value = true;
    }
};

const openAppointment = (apt) => {
    if (apt?.is_draft) {
        closePreviewPopover();
        return;
    }

    // Map API fields to form field names
    const mapped = { ...apt };
    mapped.xid = apt.xid || apt.id;
    mapped.selectedDate_full = apt.appointment_date || apt.selectedDate_full;
    mapped.selectedTimeSlot = apt.start_time
        ? moment(apt.start_time, TIME_FORMAT_DISPLAY).format("HH:mm")
        : apt.selectedTimeSlot;
    mapped.endTime = apt.end_time
        ? moment(apt.end_time, TIME_FORMAT_DISPLAY).format("HH:mm")
        : apt.endTime;

    // Parse date components for form fields
    if (mapped.selectedDate_full) {
        const d = moment(mapped.selectedDate_full, "YYYY-MM-DD");
        mapped.selectedDate = d.date();
        mapped.currentMonth = d.month();
        mapped.currentYear = d.year();
    }

    // Duration conversion: minutes → display value + unit
    if (apt.duration) {
        const mins = parseInt(apt.duration);
        if (mins >= 60 && mins % 60 === 0) {
            mapped.duration_display = mins / 60;
            mapped.duration_unit = "hours";
        } else {
            mapped.duration_display = mins;
            mapped.duration_unit = "mins";
        }
    } else if (!mapped.duration_unit) {
        mapped.duration_display = 30;
        mapped.duration_unit = "mins";
    }

    // Doctor mapping
    mapped.doctor_id = apt.doctor_id || apt.dentist_id;
    mapped.user_id = apt.user_id || resolveCalendarUserId(apt, mapped.doctor_id);

    // Resolve doctor_name from dentists array if not already set
    if (!mapped.doctor_name && mapped.doctor_id) {
        const doc = getDentistRecord(mapped.doctor_id);
        if (doc) {
            mapped.doctor_name = doc.name || doc.user?.name || "";
        }
    }

    previewFormData.value = mapped;

    // Position the preview popover near the click
    if (lastClickPosition.value) {
        previewAnchorStyle.value = {
            top: `${lastClickPosition.value.y}px`,
            left: `${lastClickPosition.value.x}px`,
            width: "1px",
            height: "1px",
            position: "fixed",
        };
    }

    previewPopoverVisible.value = true;
};

const onCaptureClick = (event) => {
    lastClickPosition.value = {
        x: event.clientX,
        y: event.clientY,
    };
};

const closePreviewPopover = () => {
    previewPopoverVisible.value = false;
    previewFormData.value = {};
    previewAnchorStyle.value = {
        top: "-9999px",
        left: "-9999px",
        width: "0px",
        height: "0px",
        position: "fixed",
    };
};

const handlePreviewOpenChange = (open) => {
    if (!open && isWarningModalOpen.value) {
        return;
    }
    previewPopoverVisible.value = open;
    if (!open) {
        closePreviewPopover();
    }
};

const onPreviewSave = () => {
    closePreviewPopover();
    fetchCalendarData({ background: true });
};

const onSlotClick = (dentistId, time, event, dateStr = null) => {
    if (event) {
        event.stopPropagation();
    }
    if (
        !isSlotUnavailable(dentistId, time, dateStr) &&
        !isSlotOccupied(dentistId, time, dateStr)
    ) {
        addAppointmentToSlot(dentistId, time, event, dateStr);
    }
};

const addAppointmentToSlot = (dentistId, timeSlot, event, dateStr = null) => {
    const targetDate = dateStr
        ? moment(dateStr, DATE_FORMAT_DB)
        : currentDate.value;

    // Default to selected dentist if none provided or if we received the generic 'week-view' column identifier
    let targetDentist = dentistId;
    if (!targetDentist || targetDentist === "week-view") {
        targetDentist =
            selectedDentists.value.length > 0
                ? selectedDentists.value[0]
                : null;
    }
    const targetUserId = getDentistUserIdByDoctorId(targetDentist);

    slotAppointmentFormData.value = {
        doctor_id: targetDentist,
        user_id: targetUserId,
        duration: 30,
        currentMonth: targetDate.month(),
        currentYear: targetDate.year(),
        selectedDate: targetDate.date(),
        selectedTimeSlot: timeSlot,
        form_type: "appointment",
    };

    if (event && event.currentTarget) {
        const rect = event.currentTarget.getBoundingClientRect();
        popoverAnchorStyle.value = {
            top: `${rect.top}px`,
            left: `${rect.left}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
            position: "fixed",
        };
    }

    slotAppointmentModalVisible.value = true;
};

const onAppointmentSave = () => {
    closeAppointmentModal();
    closeSlotAppointmentModal();
    taskModalVisible.value = false;

    // Trigger background fetch instead of awaiting it
    fetchCalendarData({ background: true });
};

const closeAppointmentModal = () => {
    appointmentModalVisible.value = false;
    appointmentFormData.value = {};
};

const closeSlotAppointmentModal = () => {
    slotAppointmentModalVisible.value = false;
    isWarningModalOpen.value = false;
    slotAppointmentFormData.value = {};
    popoverAnchorStyle.value = {
        top: "-9999px",
        left: "-9999px",
        width: "0px",
        height: "0px",
        position: "fixed",
    };
};

const handlePopoverOpenChange = (open) => {
    if (!open && isWarningModalOpen.value) {
        return; // Prevent closing if warning modal is active
    }
    slotAppointmentModalVisible.value = open;
    if (!open) {
        closeSlotAppointmentModal();
    }
};

const onDragStart = (appointment) => {
    // Delay state update so browsers snapshot the drag image at full opacity
    setTimeout(() => {
        draggedAppointmentId.value = appointment?.id || null;
    }, 0);
    document.body.classList.add("no-select");
};

const onDragEnd = () => {
    draggedAppointmentId.value = null;
    document.body.classList.remove("no-select");
};

const onDragMove = (evt) => {
    return true;
};

const onAppointmentMove = async (evt, dentistId, timeSlot, dateStr = null) => {
    if (!evt.added) return;
    const apt = evt.added.element;

    const startM = moment(timeSlot, TIME_FORMAT_DISPLAY);
    const newDbTime = startM.format("HH:mm:ss");
    const newDbDate = dateStr || currentDate.value.format(DATE_FORMAT_DB);
    const newEndTime = startM
        .clone()
        .add(apt.duration || 60, "minutes")
        .format(TIME_FORMAT_DISPLAY);

    // In week view, dentistId might be passed as generic string or null. Keep originality if so.
    const isGenericDentist = dentistId === "week-view" || !dentistId;
    const finalDentistId = isGenericDentist
        ? apt.doctor_id || apt.dentist_id
        : dentistId;
    const finalUserId = resolveCalendarUserId(apt, finalDentistId);

    // Optimistic update
    const idx = appointments.value.findIndex((a) => a.id === apt.id);
    if (idx !== -1) {
        appointments.value[idx] = {
            ...appointments.value[idx],
            doctor_id: finalDentistId,
            dentist_id: finalDentistId,
            user_id: finalUserId,
            start_time: startM.format(TIME_FORMAT_DISPLAY),
            end_time: newEndTime,
            appointment_date: newDbDate,
        };
    }
    updateAppointmentSlots();

    // Prepare reschedule modal data
    const originalStart = moment(
        `${apt.appointment_date} ${apt.start_time}`,
        `${DATE_FORMAT_DB} ${TIME_FORMAT_DISPLAY}`,
    );
    const originalEnd = moment(
        `${apt.appointment_date} ${apt.end_time}`,
        `${DATE_FORMAT_DB} ${TIME_FORMAT_DISPLAY}`,
    );

    const newStart = startM.clone();
    const newEnd = startM.clone().add(apt.duration || 60, "minutes");

    const formatStringDate = "ddd DD MMM YYYY";

    const isEvent = apt.type === "event";
    const isTask = apt.type === "task";
    const url = isTask
        ? `calendar-tasks/${apt.id}`
        : isEvent
          ? `calendar-events/${apt.id}`
          : `appointments/${apt.id}`;

    const combinedStart = moment(
        `${newDbDate} ${newDbTime}`,
        "YYYY-MM-DD HH:mm:ss",
    );
    const combinedEnd = combinedStart
        .clone()
        .add(apt.duration || 60, "minutes");

    const payload =
        isEvent || isTask
            ? {
                  _method: "PUT",
                  user_id: finalUserId,
                  start_at: combinedStart.format("YYYY-MM-DD HH:mm:ss"),
                  end_at: combinedEnd.format("YYYY-MM-DD HH:mm:ss"),
                  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              }
            : {
                  appointment_date: `${newDbDate} ${newDbTime}`,
                  doctor_id: finalDentistId,
                  _method: "PUT",
              };

    // Determine if this is the first occurrence in a recurring series
    let isFirstInSeries = false;
    if (apt.series_id) {
        const seriesSiblings = appointments.value.filter(
            (a) => a.series_id === apt.series_id && a.id !== apt.id,
        );
        const thisDate = moment(
            `${apt.appointment_date} ${apt.start_time}`,
            `${DATE_FORMAT_DB} ${TIME_FORMAT_DISPLAY}`,
        );
        isFirstInSeries = !seriesSiblings.some((a) => {
            const aDate = moment(
                `${a.appointment_date} ${a.start_time}`,
                `${DATE_FORMAT_DB} ${TIME_FORMAT_DISPLAY}`,
            );
            return aDate.isBefore(thisDate);
        });
    }

    rescheduleData.value = {
        appointment: apt,
        originalStartStr: originalStart.format(formatStringDate),
        originalTimeStr: `${originalStart.format("h:mmA")} - ${originalEnd.format("h:mmA")}`,
        newStartStr: moment(newDbDate, DATE_FORMAT_DB).format(formatStringDate),
        newTimeStr: `${newStart.format("h:mmA")} - ${newEnd.format("h:mmA")}`,
        isEvent,
        isTask,
        isFirstInSeries,
        url,
        payload,
    };

    rescheduleModalVisible.value = true;
};

const onTaskCompleteChange = (payload) => {
    const { appointment: apt, checked } = payload;

    // Create datetime objects
    const startObj = moment(
        `${apt.appointment_date} ${apt.start_time}`,
        "YYYY-MM-DD h:mm A",
    );
    const endObj = startObj.clone().add(apt.duration || 30, "minutes");

    // Virtual IDs natively handled by CalendarTaskController@update
    const realId = apt.id;

    // We send a stripped payload with just what is needed
    // update_mode='this' ensures that if it is a virtual event, an exception is safely created
    const apiPayload = {
        _method: "PUT",
        user_id: resolveCalendarUserId(apt),
        patient_id: apt.patient_id,
        title: apt.title,
        description: apt.description,
        start_at: startObj.format("YYYY-MM-DD HH:mm:ss"),
        end_at: endObj.format("YYYY-MM-DD HH:mm:ss"),
        timezone:
            apt.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        update_mode: "this",
        is_completed: checked ? 1 : 0,
    };

    // Optimistically update UI
    const idx = appointments.value.findIndex((a) => a.id === apt.id);
    if (idx !== -1) {
        appointments.value[idx] = {
            ...appointments.value[idx],
            is_completed: checked,
        };
        updateAppointmentSlots();
    }

    addEditRequestAdmin({
        url: `calendar-tasks/${realId}`,
        data: apiPayload,
        successMessage: checked ? "Task completed!" : "Task marked incomplete.",
        success: (res) => {
            fetchCalendarData({ background: true });
        },
        error: (err) => {
            // Revert on failure
            if (idx !== -1) {
                appointments.value[idx] = {
                    ...appointments.value[idx],
                    is_completed: !checked,
                };
                updateAppointmentSlots();
            }
        },
    });
};

const cancelReschedule = () => {
    if (rescheduleData.value && rescheduleData.value.appointment) {
        const apt = rescheduleData.value.appointment;
        const idx = appointments.value.findIndex((a) => a.id === apt.id);
        if (idx !== -1) {
            // Revert to original state
            appointments.value[idx] = { ...apt };
            updateAppointmentSlots();
        }
    }
    rescheduleModalVisible.value = false;
    rescheduleData.value = null;
};

const confirmReschedule = ({ notifyGuests, updateMode }) => {
    if (!rescheduleData.value) return;

    // Immediately close modal and show loading state
    const { isEvent, isTask, url, payload } = rescheduleData.value;
    rescheduleModalVisible.value = false;
    rescheduleData.value = null;

    // Only appointments get patient/provider notifications
    if (!isEvent && !isTask && notifyGuests) {
        payload.send_notification = true;
    } else if (!isEvent && !isTask) {
        payload.send_notification = false;
    }

    // Events and tasks both use update_mode for recurring series
    if ((isEvent || isTask) && updateMode) {
        payload.update_mode = updateMode;
    }

    const hideLoading = message.loading(t("common.saving", "Saving..."), 0);

    window.axiosAdmin
        .post(url, payload)
        .then(() => {
            hideLoading();
            // Refetch in background to avoid full-page spinner
            fetchCalendarData({ background: true });
        })
        .catch((e) => {
            hideLoading();
            console.error("Reschedule failed", e);
            // Revert changes visually since it failed
            fetchCalendarData({ background: true });
        });
};

const onResizeStart = (appointment) => {
    resizingAppointmentId.value = appointment?.id || null;
    document.body.classList.add("no-select");
    document.body.classList.add("is-resizing");
};

const onAppointmentResize = async ({
    appointment,
    newDuration,
    dateStr = null,
}) => {
    resizingAppointmentId.value = null;
    document.body.classList.remove("no-select");
    document.body.classList.remove("is-resizing");

    const apt = appointment;
    // Assuming TIME_FORMAT_DISPLAY is available in scope (it is used in onAppointmentMove)
    const startM = moment(apt.start_time, TIME_FORMAT_DISPLAY);

    // Calculate new end time
    const endM = startM.clone().add(newDuration, "minutes");
    const newEndTime = endM.format(TIME_FORMAT_DISPLAY);
    const dbDate = dateStr || currentDate.value.format(DATE_FORMAT_DB);
    const dbStartTime = startM.format("HH:mm:ss");
    const dbEndTime = endM.format("HH:mm:ss");

    // Optimistic update
    const idx = appointments.value.findIndex((a) => a.id === apt.id);
    if (idx !== -1) {
        appointments.value[idx] = {
            ...appointments.value[idx],
            end_time: newEndTime,
            // Update duration if tracked locally
        };
        updateAppointmentSlots();
    }

    const originalStart = moment(
        `${apt.appointment_date} ${apt.start_time}`,
        `${DATE_FORMAT_DB} ${TIME_FORMAT_DISPLAY}`,
    );
    const originalEnd = moment(
        `${apt.appointment_date} ${apt.end_time}`,
        `${DATE_FORMAT_DB} ${TIME_FORMAT_DISPLAY}`,
    );

    const newStart = startM.clone();
    const newEnd = endM.clone();

    const formatStringDate = "ddd DD MMM YYYY";

    const isEvent = apt.type === "event";
    const isTask = apt.type === "task";
    const url = isTask
        ? `calendar-tasks/${apt.id}`
        : isEvent
          ? `calendar-events/${apt.id}`
          : `appointments/${apt.id}`;

    const combinedStart = moment(
        `${dbDate} ${dbStartTime}`,
        "YYYY-MM-DD HH:mm:ss",
    );
    const combinedEnd = combinedStart.clone().add(newDuration, "minutes");

    const payload =
        isEvent || isTask
            ? {
                  _method: "PUT",
                  user_id: resolveCalendarUserId(apt),
                  start_at: combinedStart.format("YYYY-MM-DD HH:mm:ss"),
                  end_at: combinedEnd.format("YYYY-MM-DD HH:mm:ss"),
                  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              }
            : {
                  _method: "PUT",
                  doctor_id: apt.doctor_id || apt.dentist_id,
                  appointment_date: `${dbDate} ${dbStartTime}`,
                  duration: newDuration,
              };
    // Determine if this is the first occurrence in a recurring series
    let isFirstInSeries = false;
    if (apt.series_id) {
        const seriesSiblings = appointments.value.filter(
            (a) => a.series_id === apt.series_id && a.id !== apt.id,
        );
        const thisDate = moment(
            `${apt.appointment_date} ${apt.start_time}`,
            `${DATE_FORMAT_DB} ${TIME_FORMAT_DISPLAY}`,
        );
        isFirstInSeries = !seriesSiblings.some((a) => {
            const aDate = moment(
                `${a.appointment_date} ${a.start_time}`,
                `${DATE_FORMAT_DB} ${TIME_FORMAT_DISPLAY}`,
            );
            return aDate.isBefore(thisDate);
        });
    }

    rescheduleData.value = {
        appointment: apt,
        originalStartStr: originalStart.format(formatStringDate),
        originalTimeStr: `${originalStart.format("h:mmA")} - ${originalEnd.format("h:mmA")}`,
        newStartStr: moment(dbDate, DATE_FORMAT_DB).format(formatStringDate),
        newTimeStr: `${newStart.format("h:mmA")} - ${newEnd.format("h:mmA")}`,
        isEvent,
        isTask,
        isFirstInSeries,
        url,
        payload,
    };

    rescheduleModalVisible.value = true;
};

// Lifecycle
watch(currentDate, debouncedFetchData);
watch(viewMode, debouncedFetchData);
watch(selectedDentists, debouncedFetchData, { deep: true });
watch(selectedClinicId, () => {
    debouncedFetchData();
    fetchCalendarDoctors();
});
watch(appointments, updateAppointmentSlots, { deep: true });
watch(showCompletedTasks, updateAppointmentSlots);
watch(showWeekends, updateAppointmentSlots);

// Auto-select if a view mode requires it but no selection exists
watch(
    [() => viewMode.value, () => availableCalendars.value, () => showAllUsersInCalendar.value],
    ([newView, newDentists], [oldView]) => {
        if (!newDentists || newDentists.length === 0) {
            return;
        }

        if (newView === "day" && oldView !== "day") {
            selectedDentists.value = Array.from(
                new Set(dentists.value.map((doctor) => doctor.xid)),
            );
            return;
        }

        const validIds = newDentists.map((d) => d.xid);
        const currentSel = Array.from(
            new Set(
                selectedDentists.value.filter((id) => validIds.includes(id)),
            ),
        );

        if (currentSel.length !== selectedDentists.value.length) {
            selectedDentists.value = currentSel;
            return;
        }

        if (
            (newView === "day" || newView === "day_single") &&
            currentSel.length === 0 &&
            !isInitialized.value
        ) {
            selectedDentists.value = newDentists.map((d) => d.xid);
        } else if (
            (newView === "week" || newView === "month") &&
            currentSel.length === 0
        ) {
            selectedDentists.value = [newDentists[0].xid];
        }
    },
    { immediate: true, deep: true },
);

const openSettings = () => {
    openModal("clinic_schedules");
};

const printCalendar = () => {
    window.print();
};

const handleKeydown = (e) => {
    // Prevent triggering if user is typing in an input, textarea, or contenteditable
    const activeElement = document.activeElement;
    if (
        activeElement &&
        (activeElement.tagName === "INPUT" ||
            activeElement.tagName === "TEXTAREA" ||
            activeElement.isContentEditable)
    ) {
        return;
    }

    // Ignore if any modal is open
    if (
        appointmentModalVisible.value ||
        eventModalVisible.value ||
        slotAppointmentModalVisible.value ||
        rescheduleModalVisible.value
    ) {
        return;
    }

    // Handle single key hotkeys (ensure we don't block modifier combinations unless intended)
    if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        const key = e.key.toLowerCase();
        if (key === "y") {
            store.dispatch("calendar/setViewMode", "day_single");
        } else if (key === "d") {
            store.dispatch("calendar/setViewMode", "day");
        } else if (key === "w") {
            store.dispatch("calendar/setViewMode", "week");
        } else if (key === "m") {
            store.dispatch("calendar/setViewMode", "month");
        } else if (key === "a") {
            store.dispatch("calendar/setViewMode", "agenda");
        } else if (key === "p") {
            printCalendar();
        }
    }
};

onMounted(async () => {
    window.addEventListener("keydown", handleKeydown);
    await new Promise((r) => setTimeout(r, 100));
    await store.dispatch("auth/updateApp");
    await fetchCalendarDoctors();
    await fetchCalendarData();
});

onUnmounted(() => {
    window.removeEventListener("keydown", handleKeydown);
});
</script>

<style scoped>
.search-container {
    display: flex;
    align-items: center;
}

.calendar-navigation {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: white;
    padding: 16px 24px;
    border-radius: 8px;
    margin-bottom: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Custom Drag Styles for vuedraggable */
html body .appointment-drag {
    width: 200px !important; /* Prevent w-full from expanding to screen width */
    opacity: 1 !important;
    z-index: 2147483647 !important; /* Max Z-Index */
    cursor: grabbing !important;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3) !important;
    right: auto !important;
    bottom: auto !important;
    transform: none !important;
}

/* Ghost (Placeholder) Styles - Visible during drag over slots */
html body .appointment-ghost {
    background: rgba(230, 247, 255, 0.95) !important;
    border: 2px dashed #1890ff !important;
    opacity: 1 !important;
    z-index: 2147483640 !important; /* Very high priority */
    pointer-events: none !important;
    transform: none !important;
    transition: none !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;

    /* CRITICAL: Prevent ghost from expanding slot and causing target flickering */
    height: 30px !important;
    min-height: 30px !important;
    overflow: hidden !important;
}

/* GLOBAL RESIZE LOCKS */
html body.is-resizing,
html body.is-resizing * {
    cursor: ns-resize !important;
}

html body.is-resizing .calendar-slot {
    pointer-events: none !important;
}

.nav-left {
    display: flex;
    align-items: center;
    gap: 24px;
}

.appointment-count {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #595959;
    font-size: 14px;
}

.calendar-tabs-section {
    background: white;
    border-radius: 8px;
    margin-bottom: 16px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    padding: 16px 24px;
}

.calendar-tabs-section .ant-tabs {
    margin: 0;
}

.nav-center {
    display: flex;
    align-items: center;
    gap: 16px;
}

.date-navigation {
    display: flex;
    align-items: center;
    gap: 12px;
}

.current-date {
    font-weight: 600;
    color: #262626;
    min-width: 180px;
    text-align: center;
}

.nav-right {
    display: flex;
    align-items: center;
}

.no-schedule-message {
    min-height: 400px;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
}

.no-schedule-content {
    text-align: center;
    max-width: 400px;
}

.no-schedule-icon {
    font-size: 64px;
    color: #d9d9d9;
    margin-bottom: 24px;
}

.no-schedule-content h3 {
    color: #262626;
    font-size: 24px;
    font-weight: 600;
    margin-bottom: 8px;
}

.no-schedule-content p {
    color: #8c8c8c;
    font-size: 16px;
    margin-bottom: 8px;
}

.no-schedule-subtitle {
    color: #bfbfbf;
    font-size: 14px;
}
</style>

<style>
/* Disable text selection while dragging appointments */
.no-select {
    -webkit-user-select: none !important;
    -moz-user-select: none !important;
    -ms-user-select: none !important;
    user-select: none !important;
}

@media print {
    body * {
        visibility: hidden;
    }

    .printable-calendar-area,
    .printable-calendar-area * {
        visibility: visible;
    }

    .printable-calendar-area {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        margin: 0;
        padding: 0;
        background: white;
        z-index: 9999;
    }

    .printable-calendar-area .overflow-y-auto,
    .printable-calendar-area .overflow-x-scroll {
        overflow: visible !important;
        max-height: none !important;
    }

    /* Hide unnecessary UI elements for printing */
    .printable-calendar-area .ant-btn,
    .printable-calendar-area .nav-right,
    .printable-calendar-area .calendar-content > div:first-child:not(.flex-1) {
        display: none !important;
    }
}
</style>
