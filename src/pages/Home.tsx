import { AppLayout } from "@/components/AppLayout";

const Home = () => {
  return (
    <AppLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground text-sm">
          Welcome to Transcologistics
        </p>
      </div>
    </AppLayout>
  );
};

export default Home;
