<template>
    <div
        class="bg-white transition-[width,opacity] duration-300 ease-in-out shrink-0 overflow-hidden"
        :class="
            visible
                ? 'w-64 border-r border-gray-200 opacity-100'
                : 'w-0 border-r-0 opacity-0'
        "
    >
        <div class="w-64 flex flex-col">
            <!-- Header -->
            <div class="p-4 flex items-center border-b border-gray-100">
                <span class="font-semibold text-gray-800 truncate">{{
                    title
                }}</span>
            </div>

            <!-- Filter List -->
            <div class="flex-1 overflow-y-auto p-4 custom-scrollbar max-h-[calc(100svh-180px)]">
                <!-- All Team Option (Hidden in Single Select Mode) -->
                <div
                    v-if="!singleSelect"
                    class="flex items-center gap-3 mb-1 rounded hover:bg-gray-50 p-2 cursor-pointer transition-colors"
                    @click.self="toggleAll"
                >
                    <a-checkbox
                        :checked="isAllSelected"
                        :indeterminate="isIndeterminate"
                        @change="toggleAll"
                    />
                    <div
                        class="flex items-center gap-3 overflow-hidden"
                        @click="toggleAll"
                    >
                        <div
                            class="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-500 border border-gray-200"
                        >
                            <TeamOutlined />
                        </div>
                        <span class="text-sm font-medium text-gray-800 truncate"
                            >{{ allLabel }} ({{ resources.length }})</span
                        >
                    </div>
                </div>

                <!-- Individual Resources -->
                <div
                    v-for="resource in resources"
                    :key="resource.xid"
                    class="flex items-center gap-3 mb-2 rounded hover:bg-gray-50 p-2 cursor-pointer transition-colors"
                    @click.self="toggleResource(resource.xid)"
                >
                    <a-radio
                        v-if="singleSelect"
                        :checked="
                            selectedResources.length === 1 &&
                            selectedResources[0] === resource.xid
                        "
                        @change="() => toggleResource(resource.xid)"
                    />
                    <a-checkbox
                        v-else
                        :checked="selectedResources.includes(resource.xid)"
                        @change="() => toggleResource(resource.xid)"
                    />
                    <div
                        class="flex items-center gap-3 overflow-hidden"
                        @click="toggleResource(resource.xid)"
                    >
                        <a-avatar
                            :src="resource.image"
                            :alt="resource.name"
                            :size="24"
                            class="flex-shrink-0 bg-gray-200 border border-gray-200 text-gray-600"
                        >
                            {{ resource.name.charAt(0) }}
                        </a-avatar>
                        <span
                            class="text-sm text-gray-700 truncate"
                            :title="resource.name"
                            >{{ resource.name }}</span
                        >
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
import { computed } from "vue";
import { TeamOutlined } from "@ant-design/icons-vue";

const props = defineProps({
    resources: {
        type: Array,
        required: true,
        default: () => [],
    },
    selectedResources: {
        type: Array,
        required: true,
        default: () => [],
    },
    visible: {
        type: Boolean,
        default: true,
    },
    singleSelect: {
        type: Boolean,
        default: false,
    },
    title: {
        type: String,
        default: "Calendars",
    },
    allLabel: {
        type: String,
        default: "All team",
    },
});

const emit = defineEmits(["update:selectedResources"]);

const isAllSelected = computed(() => {
    return (
        props.resources.length > 0 &&
        props.selectedResources.length === props.resources.length
    );
});

const isIndeterminate = computed(() => {
    return (
        props.selectedResources.length > 0 &&
        props.selectedResources.length < props.resources.length
    );
});

const toggleAll = () => {
    if (isAllSelected.value) {
        // Deselect all
        emit("update:selectedResources", []);
    } else {
        // Select all
        const allIds = props.resources.map((resource) => resource.xid);
        emit("update:selectedResources", allIds);
    }
};

const toggleResource = (id) => {
    if (props.singleSelect) {
        emit("update:selectedResources", [id]);
        return;
    }

    const newSelection = [...props.selectedResources];
    const index = newSelection.indexOf(id);
    if (index > -1) {
        newSelection.splice(index, 1);
    } else {
        newSelection.push(id);
    }
    emit("update:selectedResources", newSelection);
};
</script>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
    width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: #e5e7eb;
    border-radius: 20px;
}
</style>
